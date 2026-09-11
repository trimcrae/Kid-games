"""Lived-in dressing for the browser game world. Executed in build.py's namespace.

Runs after exterior.py, in world Blender coordinates (X right, +Y toward the
back yard, Z up). Rugs, cushions, plants, kid art and in-use clusters make each
room read as a family home, and the garden gets a raised vegetable bed at the
Garden & maths spot, a stepping-stone path and flower beds. Everything here is
invented dressing, not photographed. Kid art is code-drawn shapes only: no
photographs and no generated images.

Browser contract (export_walkthrough.py):
- Collections 44-48 export as one draw group per dressing material.
- ``browser_collide = False`` on a prop's parent empty marks walk-past items:
  rugs, wall pieces, shelf/counter/bed props, small toys, flowers and stepping
  stones. Blocking props (baskets, bench, beanbag, easel, plant pots, veg bed)
  keep the default collision box; tests/house-dressing.mjs checks their lanes.
- Props sit on the surface a downward ray cast finds in the house as built
  before dressing, so nothing floats above, or sinks into, tile or carpet.
"""
from mathutils import Euler as _Euler

_rng = random.Random(20260911)


def _lin(code):
    h = code.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in c)


def _dm(name, code, rough=.88):
    return material(name, _lin(code), rough)


# A1 art-direction accents (sRGB), stored linear like every house material.
D = {
    'coral': _dm('Dressing coral cotton', '#e27d6a'),
    'mustard': _dm('Dressing mustard cotton', '#e0b04a'),
    'teal': _dm('Dressing teal cotton', '#3f8f8a'),
    'rose': _dm('Dressing rose cotton', '#d49aa0'),
    'corn': _dm('Dressing cornflower cotton', '#6f8fd0'),
    'cream': _dm('Dressing cream cotton', '#efe6d2'),
    'paper': _dm('Dressing paper white', '#f5f1e6', .86),
    'ink': _dm('Dressing charcoal ink', '#3b2e25', .8),
    'leaf': _dm('Houseplant leaves', '#5f9444', .8),
    'terra': _dm('Dressing terracotta', '#b8643e', .86),
    'wood': _dm('Dressing honey oak toys', '#b0834f', .6),
    'kraft': _dm('Dressing kraft cardboard', '#b8956a', .9),
    'cedar': _dm('Garden bed cedar oak', '#9a6a45', .85),
    'soil': _dm('Garden bed soil mulch', '#4a3526', .95),
    'stone': _dm('Garden stepping stone pavers', '#b9b2a3', .9),
    'fpink': _dm('Garden pink flower foliage', '#f29fb7', .8),
    'fyellow': _dm('Garden yellow flower foliage', '#f6d25c', .8),
    'flilac': _dm('Garden lilac flower foliage', '#b58ee0', .8),
}
FLOWERS = [D['fpink'], D['fyellow'], D['flilac'], D['paper']]

DRESSING_COLLECTIONS = {}
for _key, _name in [('main', '44 | Dressing - main floor'), ('upper', '45 | Dressing - upstairs'),
                    ('lower', '46 | Dressing - lower wing'), ('base', '47 | Dressing - basement and garage'),
                    ('garden', '48 | Dressing - garden')]:
    DRESSING_COLLECTIONS[_key] = collection(_name)


def dressing_view(name, upper_view, basement_view, garage_view, pink_view, elevation):
    """Named Blender views show the dressing of the level they look at."""
    plan = name in {'plan', 'upper_plan', 'basement_plan'}
    visible = {
        'main': not (upper_view or basement_view or garage_view or pink_view),
        'upper': upper_view or elevation or name in {'overview', 'stairs'},
        'lower': not (upper_view or basement_view or garage_view),
        'base': basement_view or garage_view or name in {'overview', 'basement_stairs', 'kitchen', 'kitchen_access'},
        'garden': elevation or not (plan or upper_view or basement_view or garage_view or pink_view),
    }
    for key, c in DRESSING_COLLECTIONS.items():
        c.hide_render = c.hide_viewport = not visible[key]


def _use(key):
    global COLL, ROOT
    COLL = DRESSING_COLLECTIONS[key]
    ROOT = None


# ------------------------------------------------------------------ placement
_made = set()
_depsgraph = []


def _cast(origin, direction, reach):
    """First non-dressing surface along a ray, as (location, normal)."""
    if not _depsgraph:
        bpy.context.view_layer.update()
        _depsgraph.append(bpy.context.evaluated_depsgraph_get())
    o, d = Vector(origin), Vector(direction).normalized()
    left = reach
    for _ in range(16):
        hit, loc, normal, _i, obj, _mx = scene.ray_cast(_depsgraph[0], o, d, distance=left)
        if not hit:
            return None, None
        if obj.name in _made:
            travelled = (loc - o).length + .0005
            o, left = loc + d * .0005, left - travelled
            continue
        return loc, normal
    return None, None


def down(x, y, top, reach=1.6):
    """Z of the surface under (x, y), searching down from ``top``. Five rays a
    few centimetres apart: a single ray can slip through a 1 mm floorboard gap
    and report the subfloor, which would sink a rug below the boards."""
    hits = []
    for dx, dy in [(0, 0), (.03, .011), (-.03, -.013), (.012, .03), (-.011, -.03)]:
        loc, _n = _cast((x + dx, y + dy, top), (0, 0, -1), reach)
        if loc is not None:
            hits.append(loc.z)
    if not hits:
        raise RuntimeError('dressing: no surface under %.2f, %.2f from %.2f' % (x, y, top))
    return max(hits)


def down_max(x, y, top, dx, dy):
    """Highest surface under a footprint (patterned tile has raised motifs)."""
    return max(down(x + i * dx, y + j * dy, top) for i in (-1, 0, 1) for j in (-1, 0, 1))


def ground(x, y, top=1.0):
    loc, normal = _cast((x, y, top), (0, 0, -1), 3.0)
    if loc is None:
        raise RuntimeError('dressing: no ground at %.2f, %.2f' % (x, y))
    return loc, normal


def wall_hit(x, y, z, direction, reach=1.5):
    """Point on the wall face hit from (x, y, z); art faces back along the ray."""
    loc, _n = _cast((x, y, z), direction, reach)
    if loc is None:
        raise RuntimeError('dressing: no wall from %.2f, %.2f, %.2f' % (x, y, z))
    return loc


FACING = {(0, 1, 0): 0, (0, -1, 0): 180, (1, 0, 0): -90, (-1, 0, 0): 90}  # ray direction -> art angle


# ------------------------------------------------------------------ geometry
def _rot(rot):
    return _Euler(rot, 'XYZ').to_matrix() if rot else None


class Geo:
    """One mesh per prop, several dressing materials, parented to the prop."""

    def __init__(self, root, name):
        self.root, self.name, self.coll = root, name, COLL
        self.verts, self.faces, self.mats, self.fmat, self.smooth = [], [], [], [], []

    def raw(self, pts, faces, mat, smooth=False, at=(0, 0, 0), rot=None, both=False):
        R, c = _rot(rot), Vector(at)
        if mat not in self.mats:
            self.mats.append(mat)
        mi = self.mats.index(mat)
        # Two-sided flat shapes get their own reversed copy (no shared-vertex duplicate faces).
        for flip in ([False, True] if both else [False]):
            base = len(self.verts)
            for p in pts:
                v = Vector(p)
                self.verts.append(tuple((R @ v if R else v) + c))
            for k, f in enumerate(faces):
                self.faces.append(tuple(base + i for i in (reversed(f) if flip else f)))
                self.fmat.append(mi)
                self.smooth.append(smooth[k] if isinstance(smooth, list) else smooth)
        return self

    def box(self, at, size, mat, rot=None):
        x, y, z = (v / 2 for v in size)
        pts = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
               (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
        faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        return self.raw(pts, faces, mat, False, at, rot)

    def cyl(self, at, r, h, mat, n=12, top=None, rot=None, caps=(True, True), sy=1.0):
        t = r if top is None else top
        pts = [(rr * math.cos(i * math.tau / n), rr * math.sin(i * math.tau / n) * sy, zz)
               for rr, zz in [(r, -h / 2), (t, h / 2)] for i in range(n)]
        faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        smooth = [True] * n
        if caps[0] and r > 1e-4:
            faces.append(tuple(reversed(range(n))))
            smooth.append(False)
        if caps[1] and t > 1e-4:
            faces.append(tuple(range(n, 2 * n)))
            smooth.append(False)
        return self.raw(pts, faces, mat, smooth, at, rot)

    def ball(self, at, rad, mat, n=10, rings=6, rot=None):
        rx, ry, rz = rad if isinstance(rad, tuple) else (rad, rad, rad)
        pts = [(0, 0, rz)]
        pts += [(rx * math.sin(j * math.pi / rings) * math.cos(i * math.tau / n),
                 ry * math.sin(j * math.pi / rings) * math.sin(i * math.tau / n),
                 rz * math.cos(j * math.pi / rings)) for j in range(1, rings) for i in range(n)]
        pts.append((0, 0, -rz))
        faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
        for j in range(rings - 2):
            a, b = 1 + j * n, 1 + (j + 1) * n
            faces += [(a + i, b + i, b + (i + 1) % n, a + (i + 1) % n) for i in range(n)]
        last = 1 + (rings - 2) * n
        faces += [(len(pts) - 1, last + (i + 1) % n, last + i) for i in range(n)]
        return self.raw(pts, faces, mat, True, at, rot)

    def soft(self, at, size, mat, rad=.04, rot=None):
        """Pillowy rounded box: 3 x 3 quads a side (108 triangles)."""
        half = [v / 2 for v in size]
        rad = min(rad, min(half) * .95)
        inner = [h - rad for h in half]
        levels = [[-h, -h + rad, h - rad, h] for h in half]
        pts, faces, index = [], [], {}
        for axis in range(3):
            u, v = (axis + 1) % 3, (axis + 2) % 3
            for sign in (-1, 1):
                grid = []
                for b in levels[v]:
                    row = []
                    for a in levels[u]:
                        p = [0, 0, 0]
                        p[axis], p[u], p[v] = sign * half[axis], a, b
                        core = Vector([max(-h, min(h, c)) for c, h in zip(p, inner)])
                        q = core + (Vector(p) - core).normalized() * rad
                        key = tuple(round(c, 7) for c in q)
                        if key not in index:
                            index[key] = len(pts)
                            pts.append(tuple(q))
                        row.append(index[key])
                    grid.append(row)
                for j in range(3):
                    for i in range(3):
                        f = (grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i])
                        faces.append(f if sign > 0 else tuple(reversed(f)))
        return self.raw(pts, faces, mat, True, at, rot)

    def flat(self, pts2, z, mat, at=(0, 0, 0), rot=None, both=False):
        """Horizontal polygon, counter-clockwise (x, y) points, facing up."""
        return self.raw([(x, y, z) for x, y in pts2], [tuple(range(len(pts2)))], mat, False, at, rot, both)

    def vflat(self, pts2, y, mat, at=(0, 0, 0), rot=None, both=False):
        """Upright polygon in the local x/z plane facing -Y (counter-clockwise x, z)."""
        return self.raw([(x, y, z) for x, z in pts2], [tuple(range(len(pts2)))], mat, False, at, rot, both)

    def rug(self, x0, y0, x1, y1, z, th, mat, nx=8, ny=6):
        """Rug body: a subdivided top (so baked AO can darken it under furniture) and four edges."""
        pts = [(x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, z + th) for j in range(ny + 1) for i in range(nx + 1)]
        faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i)
                 for j in range(ny) for i in range(nx)]
        self.raw(pts, faces, mat)
        zt = z + th
        for side in [[(x0, y0, z), (x1, y0, z), (x1, y0, zt), (x0, y0, zt)],
                     [(x1, y1, z), (x0, y1, z), (x0, y1, zt), (x1, y1, zt)],
                     [(x0, y1, z), (x0, y0, z), (x0, y0, zt), (x0, y1, zt)],
                     [(x1, y0, z), (x1, y1, z), (x1, y1, zt), (x1, y0, zt)]]:
            self.raw(side, [(0, 1, 2, 3)], mat)
        return self

    def leaves(self, centre, count, spread, size, mat=None, up=.5, zspread=None, droop=0.0):
        mat = mat or D['leaf']
        zs = spread if zspread is None else zspread
        for _ in range(count):
            c = Vector(centre) + Vector((_rng.uniform(-spread, spread), _rng.uniform(-spread, spread),
                                         _rng.uniform(-zs, zs)))
            if droop:
                c.z -= droop * (abs(c.x - centre[0]) + abs(c.y - centre[1])) / max(spread, 1e-3)
            n = Vector((_rng.uniform(-1, 1), _rng.uniform(-1, 1), _rng.uniform(up, 1))).normalized()
            u = n.cross(Vector((0, 0, 1)) if abs(n.z) < .9 else Vector((1, 0, 0))).normalized()
            v = n.cross(u)
            r, spin = size * _rng.uniform(.75, 1.25), _rng.uniform(0, math.tau)
            pts = [tuple(c + (u * math.cos(spin + q * math.tau / 4) + v * math.sin(spin + q * math.tau / 4))
                         * r * (1 if q % 2 == 0 else .42)) for q in range(4)]
            self.raw(pts, [(0, 1, 2, 3)], mat)
        return self

    def merge(self, other, at=(0, 0, 0), rot=None):
        R, c, base = _rot(rot), Vector(at), len(self.verts)
        for p in other.verts:
            v = Vector(p)
            self.verts.append(tuple((R @ v if R else v) + c))
        for m in other.mats:
            if m not in self.mats:
                self.mats.append(m)
        for f, mi, flag in zip(other.faces, other.fmat, other.smooth):
            self.faces.append(tuple(base + i for i in f))
            self.fmat.append(self.mats.index(other.mats[mi]))
            self.smooth.append(flag)
        return self

    def done(self):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.verts, [], self.faces)
        for m in self.mats:
            mesh.materials.append(m)
        for poly, mi, flag in zip(mesh.polygons, self.fmat, self.smooth):
            poly.material_index = mi
            poly.use_smooth = flag
        obj = bpy.data.objects.new(self.name + ' shape', mesh)
        self.coll.objects.link(obj)
        obj.parent = self.root
        if self.root.get('browser_collide') is False:
            obj['browser_collide'] = False
        _made.add(obj.name)
        return obj


def prop(name, x, y, z, angle=0, blocking=False, station=None):
    """A dressing asset (parent empty) and its geometry builder in local coordinates."""
    asset(name, (x, y, z), angle, 'A4 lived-in dressing', 'invented lived-in dressing; not photographed')
    if not blocking:
        ROOT['browser_collide'] = False
    if station:
        ROOT['browser_station_prop'] = station
    return Geo(ROOT, name)


def wall_prop(name, x, y, z, direction, out=.001):
    """An asset on the wall face hit by a ray; local -Y points out of the wall."""
    p = wall_hit(x, y, z, direction)
    d = Vector(direction)
    p = p - d * out
    return prop(name, p.x, p.y, p.z, FACING[tuple(int(round(c)) for c in direction)])


def star(r_out, r_in, points=5, spin=math.pi / 2, cx=0, cy=0):
    return [(cx + (r_out if k % 2 == 0 else r_in) * math.cos(spin + k * math.pi / points),
             cy + (r_out if k % 2 == 0 else r_in) * math.sin(spin + k * math.pi / points)) for k in range(2 * points)]


def ngon(r, n=16, cx=0, cy=0, sx=1.0, sy=1.0, a0=0.0):
    return [(cx + r * sx * math.cos(a0 + i * math.tau / n), cy + r * sy * math.sin(a0 + i * math.tau / n)) for i in range(n)]


def text_mesh(body, size):
    """Local font turned into flat (x, y) polygons facing +Z, centred at the origin."""
    data = bpy.data.curves.new('Dressing lettering', 'FONT')
    data.body, data.size, data.align_x, data.align_y, data.resolution_u = body, size, 'CENTER', 'CENTER', 2
    obj = bpy.data.objects.new('Dressing lettering', data)
    scene.collection.objects.link(obj)
    bpy.context.view_layer.update()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    pts = [tuple(v.co) for v in mesh.vertices]
    faces = [tuple(p.vertices) for p in mesh.polygons]
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.curves.remove(data)
    bpy.data.meshes.remove(mesh)
    return pts, faces


# ------------------------------------------------------------------ code-drawn kid art
def art(target, cx, cz, w, h, motif, y0=0.0, frame=True, at=(0, 0, 0), rot=None):
    """A paper drawing in the local x/z plane (front -Y) from simple shapes,
    merged into ``target`` after an optional placement (at, rot)."""
    g = Geo(target.root, target.name)
    g.box((cx, y0 - .003, cz), (w, .006, h), D['paper'])
    layer = [y0 - .0065]

    def P(u, v):
        return (cx + u * w, cz + v * h)

    def put(pts2, mat):
        g.vflat(pts2, layer[0], mat)
        layer[0] -= .0012

    def disc(u, v, r, mat, n=16, sx=1.0, sy=1.0):
        rr = r * min(w, h)
        put([(cx + u * w + rr * sx * math.cos(i * math.tau / n), cz + v * h + rr * sy * math.sin(i * math.tau / n))
             for i in range(n)], mat)

    def rect(u0, v0, u1, v1, mat):
        put([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], mat)

    def tri(a, b, c, mat):
        put([P(*a), P(*b), P(*c)], mat)

    def arcs(u, v, radii, mats, n=12):
        m = min(w, h)
        for (r0, r1), mat in zip(radii, mats):
            for k in range(n):
                a, b = k * math.pi / n, (k + 1) * math.pi / n
                ox, oz = cx + u * w, cz + v * h
                g.vflat([(ox + r0 * m * math.cos(a), oz + r0 * m * math.sin(a)),
                         (ox + r1 * m * math.cos(a), oz + r1 * m * math.sin(a)),
                         (ox + r1 * m * math.cos(b), oz + r1 * m * math.sin(b)),
                         (ox + r0 * m * math.cos(b), oz + r0 * m * math.sin(b))], layer[0], mat)
            layer[0] -= .0012

    if motif == 'sun_house':
        rect(-.5, -.5, .5, -.28, D['teal'])
        disc(-.28, .26, .14, D['mustard'])
        rect(.0, -.28, .32, .06, D['coral'])
        tri((-.04, .06), (.36, .06), (.16, .30), D['ink'])
        rect(.12, -.28, .20, -.10, D['corn'])
    elif motif == 'rainbow':
        arcs(0, -.36, [(.62, .72), (.52, .62), (.42, .52), (.32, .42), (.22, .32)],
             [D['coral'], D['mustard'], D['teal'], D['corn'], D['rose']])
        disc(.34, .30, .10, D['mustard'])
    elif motif == 'flower':
        rect(-.02, -.45, .02, .05, D['teal'])
        tri((0, -.2), (.22, -.08), (.02, -.14), D['teal'])
        for k in range(6):
            a = k * math.tau / 6
            disc(.13 * math.cos(a), .18 + .1 * math.sin(a), .1, D['rose'])
        disc(0, .18, .07, D['mustard'])
    elif motif == 'pet':
        disc(0, -.08, .30, D['corn'], sx=1.1, sy=.9)
        disc(-.14, .22, .08, D['corn'])
        disc(.14, .22, .08, D['corn'])
        disc(-.1, 0, .05, D['ink'])
        disc(.1, 0, .05, D['ink'])
        disc(0, -.14, .06, D['rose'])
    elif motif == 'heart':
        disc(-.13, .08, .2, D['rose'])
        disc(.13, .08, .2, D['rose'])
        tri((-.33, .04), (0, -.36), (.33, .04), D['rose'])
    elif motif == 'whale':
        rect(-.5, -.5, .5, -.2, D['corn'])
        disc(-.05, -.02, .28, D['teal'], sx=1.4, sy=.75)
        tri((.28, -.02), (.46, -.18), (.46, .16), D['teal'])
        disc(-.24, .04, .035, D['ink'])
        for u in (-.12, -.05, .02):
            disc(u, .34, .035, D['corn'])
    elif motif == 'castle':
        rect(-.4, -.45, .4, -.05, D['rose'])
        for u in (-.34, 0, .34):
            rect(u - .1, -.05, u + .1, .22, D['rose'])
            tri((u - .13, .22), (u + .13, .22), (u, .42), D['corn'])
        rect(-.07, -.45, .07, -.2, D['ink'])
        disc(.36, .36, .06, D['mustard'])
    elif motif == 'moon':
        rect(-.5, -.5, .5, .5, D['corn'])
        disc(-.08, .06, .26, D['mustard'])
        disc(.04, .12, .24, D['corn'])
        for u, v in [(.3, .3), (.25, -.25), (-.3, -.32), (.36, -.02)]:
            put(star(.05 * min(w, h), .022 * min(w, h), cx=cx + u * w, cy=cz + v * h), D['paper'])
    elif motif == 'landscape':
        rect(-.5, -.5, .5, .5, D['corn'])
        disc(.28, .26, .12, D['mustard'])
        disc(-.3, -.5, .45, D['teal'], sy=.7)
        disc(.25, -.55, .5, D['teal'], sy=.55)
        rect(-.5, -.5, .5, -.36, D['coral'])
    elif motif == 'pets3':
        rect(-.5, -.5, .5, -.3, D['teal'])
        for u, mat in [(-.3, D['coral']), (0, D['corn']), (.3, D['mustard'])]:
            disc(u, -.12, .16, mat)
            disc(u - .05, -.05, .025, D['ink'])
            disc(u + .05, -.05, .025, D['ink'])
    elif motif == 'abstract':
        disc(-.18, .12, .28, D['rose'])
        rect(.0, -.40, .38, .05, D['mustard'])
        disc(.22, .26, .14, D['teal'])
        rect(-.42, -.42, -.08, -.28, D['coral'])
    elif motif == 'grid':
        cols = [D['coral'], D['mustard'], D['teal'], D['corn']]
        for i in range(6):
            for j in range(8):
                u0, v0 = -.46 + i * .92 / 6, -.46 + j * .92 / 8
                rect(u0 + .01, v0 + .008, u0 + .92 / 6 - .01, v0 + .92 / 8 - .008, cols[((i + 1) * (j + 1)) % 4])
    elif motif == 'duck':
        rect(-.5, -.5, .5, -.18, D['corn'])
        disc(-.05, -.08, .26, D['mustard'], sx=1.3, sy=.8)
        disc(.16, .18, .15, D['mustard'])
        tri((.28, .20), (.28, .12), (.44, .14), D['coral'])
        disc(.19, .23, .03, D['ink'])
    elif motif == 'dress':
        tri((-.30, -.42), (.30, -.42), (0, .10), D['rose'])
        rect(-.09, .02, .09, .22, D['rose'])
        for k in range(3):
            tri((-.08 + k * .08, .26), (-.04 + k * .08, .26), (-.06 + k * .08, .38), D['mustard'])
        rect(-.09, .24, .09, .27, D['mustard'])
        for u in (-.16, 0, .16):
            disc(u, -.30, .035, D['paper'])
    elif motif == 'pixel':
        # An 8 x 8 pixel rocket, block-game style (original shapes, no characters).
        rows = ['...rr...', '..rppr..', '..pbbp..', '..pbbp..', '..pppp..', '.rppppr.', '.r.yy.r.', '...yy...']
        cmap = {'r': D['coral'], 'p': D['paper'], 'b': D['corn'], 'y': D['mustard']}
        rect(-.5, -.5, .5, .5, D['ink'])
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch in cmap:
                    u0, v0 = -.44 + i * .11, .44 - (j + 1) * .11
                    rect(u0, v0, u0 + .105, v0 + .105, cmap[ch])
    if frame:
        fw = .022
        for dx in (-1, 1):
            g.box((cx + dx * (w / 2 + fw / 2), y0 - .010, cz), (fw, .02, h + 2 * fw), D['wood'])
        for dz in (-1, 1):
            g.box((cx, y0 - .010, cz + dz * (h / 2 + fw / 2)), (w, .02, fw), D['wood'])
    target.merge(g, at, rot)
    return target


def framed(name, x, y, z, direction, w, h, motif, frame=True):
    g = wall_prop(name, x, y, z, direction)
    art(g, 0, 0, w, h, motif, 0.0, frame)
    return g.done()


def plant(g, x, y, z, pot_r=.09, pot_h=.12, height=.30, count=26, trailing=False, pot=None):
    """Terracotta pot, soil and leaf cards (local coordinates, z = pot base)."""
    g.cyl((x, y, z + pot_h / 2), pot_r * .8, pot_h, pot or D['terra'], 12, top=pot_r)
    g.cyl((x, y, z + pot_h - .012), pot_r * .92, .01, D['soil'], 12)
    if trailing:
        g.leaves((x, y, z + pot_h + .04), count, pot_r * 1.6, .05, zspread=.05, droop=.12)
    else:
        g.leaves((x, y, z + pot_h + height * .55), count, height * .38, .06, zspread=height * .4)
    return g


def flower(g, x, y, z, h, mat):
    tilt = (_rng.uniform(-.25, .25), _rng.uniform(-.25, .25), 0)
    g.box((x, y, z + h / 2), (.012, .012, h), D['leaf'])
    # Foliage finishes render both sides already; paper-white petals need a back face.
    g.flat(star(.07, .03, 5, _rng.uniform(0, 1)), 0, mat, at=(x, y, z + h), rot=tilt, both=mat is D['paper'])
    g.cyl((x, y, z + h + .007), .018, .014, D['mustard'], 8, rot=tilt)
    g.leaves((x, y, z + h * .35), 2, .04, .05, zspread=.04, up=.3)


def book_row(g, x0, y, z, length, depth, axis='x', hmin=.12, hmax=.20, lean_end=False):
    cols = [D['coral'], D['corn'], D['mustard'], D['teal'], D['rose'], D['cream']]
    pos = 0.0
    while pos < length - .03:
        t = _rng.uniform(.022, .045)
        hh = _rng.uniform(hmin, hmax)
        c = pos + t / 2
        if axis == 'x':
            g.box((x0 + c, y, z + hh / 2), (t, depth, hh), _rng.choice(cols))
        else:
            g.box((x0, y + c, z + hh / 2), (depth, t, hh), _rng.choice(cols))
        pos += t + .002


def teddy(g, x, y, z, fur, face=None, s=1.0, n=8, rings=5):
    """A sitting soft toy made from spheres, facing local -Y."""
    face = face or D['cream']
    g.ball((x, y, z + .10 * s), (.10 * s, .09 * s, .11 * s), fur, n, rings)
    g.ball((x, y, z + .27 * s), .075 * s, fur, n, rings)
    for dx in (-1, 1):
        g.ball((x + dx * .055 * s, y + .01 * s, z + .34 * s), .028 * s, fur, 6, 4)
        g.ball((x + dx * .10 * s, y - .02 * s, z + .15 * s), (.03 * s, .03 * s, .05 * s), fur, 6, 4)
        g.ball((x + dx * .06 * s, y - .07 * s, z + .03 * s), (.035 * s, .05 * s, .03 * s), face, 6, 4)
        g.ball((x + dx * .025 * s, y - .066 * s, z + .29 * s), .009 * s, D['ink'], 5, 3)
    g.ball((x, y - .065 * s, z + .25 * s), (.03 * s, .02 * s, .022 * s), face, 6, 4)


def cushion(g, x, y, z, w, t, h, mat, rot):
    g.soft((x, y, z), (w, t, h) if abs(rot[2]) < .1 else (t, w, h), mat, .045, rot)


def rug_on(name, cx, cy, top, w, d, field, border=None, bw=.10, stripes=(), motifs=(), angle=0,
           nx=8, ny=6, th=.008, z=None, footprint=False):
    """A rug centred on (cx, cy); stripes/motifs are drawn 1-3 mm proud of it."""
    if z is None:
        z = down_max(cx, cy, top, w * .3, d * .3) if footprint else down(cx, cy, top)
    g = prop(name, cx, cy, z + .0015, angle)
    g.rug(-w / 2, -d / 2, w / 2, d / 2, 0, th, field, nx, ny)
    zt = th + .0012
    if border:
        for x0, y0, x1, y1 in [(-w / 2, -d / 2, w / 2, -d / 2 + bw), (-w / 2, d / 2 - bw, w / 2, d / 2),
                               (-w / 2, -d / 2 + bw, -w / 2 + bw, d / 2 - bw), (w / 2 - bw, -d / 2 + bw, w / 2, d / 2 - bw)]:
            g.flat([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], zt, border)
    for x0, y0, x1, y1, mat in stripes:
        g.flat([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], zt + .0008, mat)
    for shape, mat in motifs:
        g.flat(shape, zt + .0016, mat)
    return g, z + .0015 + th + .0028


def diamond(cx, cy, r):
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]


# ================================================================== MAIN FLOOR
_use('main')

# Living room: a soft rug under the whole seating group, cushions, a throw,
# a half-done jigsaw on the tray table, toys, kid art and a plant.
g, _ = rug_on('Living room coral bordered rug', 2.35, 2.30, .30, 3.2, 2.8, D['cream'], D['coral'], .12,
              stripes=[(-1.40, -1.22, 1.40, -1.18, D['teal']), (-1.40, 1.18, 1.40, 1.22, D['teal']),
                       (-1.40, -1.22, -1.36, 1.22, D['teal']), (1.36, -1.22, 1.40, 1.22, D['teal'])],
              motifs=[(diamond(-1.2 + k * .30, y, .07), D['mustard'] if k % 2 else D['teal'])
                      for k in range(9) for y in (-1.29, 1.29)]
                     + [(diamond(x, y, .16), D['mustard']) for x in (-1.12, 1.12) for y in (-.92, .92)], nx=10, ny=8)
g.done()

g = prop('Living sofa accent cushions', .47, 2.58, 0)
for dy, mat in [(-.63, D['coral']), (0, D['mustard']), (.62, D['teal'])]:
    g.soft((0, dy, .70), (.13, .42, .40), mat, .05, (0, -.26, 0))
g.done()
g = prop('Living sofa arm knit throw', .56, 3.53, 0)
g.soft((0, 0, .738), (.62, .34, .032), D['rose'], .012)
g.soft((0, -.172, .60), (.62, .03, .27), D['rose'], .012)
g.done()
g = prop('Living tub chair cushion', 2.85, 3.08, 0)
g.soft((0, 0, .64), (.36, .12, .30), D['mustard'], .05, (-.25, 0, 0))
g.done()

zt = down(1.82, 2.10, .80)
g = prop('Living tray table jigsaw and picture book', 1.82, 2.30, zt)
g.box((-.07, -.18, .002), (.50, .34, .004), D['paper'])
for k in range(14):
    g.box((-.07 + _rng.uniform(-.21, .21), -.18 + _rng.uniform(-.13, .13), .006),
          (.065, .065, .004), [D['coral'], D['mustard'], D['teal'], D['corn']][k % 4], (0, 0, _rng.uniform(0, 1)))
g.box((.13, .38, .02), (.30, .22, .04), D['kraft'], (0, 0, .2))
g.box((-.12, .35, .012), (.20, .26, .006), D['corn'], (0, .12, 0))
g.box((-.12 + .09, .35, .016), (.18, .24, .004), D['paper'], (0, -.08, 0))
g.box((-.12 - .09, .35, .016), (.18, .24, .004), D['paper'], (0, .08, 0))
g.cyl((.23, -.42, .045), .033, .09, D['rose'], 12)
g.done()

z0 = down(.45, 1.25, .30)
g = prop('Living toy basket', .45, 1.25, z0, blocking=True)
for x, y, sx, sy in [(-.16, 0, .02, .26), (.16, 0, .02, .26), (0, -.12, .34, .02), (0, .12, .34, .02)]:
    g.box((x, y, .12), (sx, sy, .24), D['kraft'])
g.box((0, 0, .015), (.32, .24, .03), D['kraft'])
g.ball((-.06, -.02, .26), .08, D['coral'])
g.box((.08, .03, .25), (.10, .10, .10), D['mustard'], (.3, .2, .5))
g.ball((.02, .05, .30), .06, D['corn'])
for dx in (-1, 1):
    g.ball((.02 + dx * .045, .05, .355), .022, D['corn'], 6, 4)
g.done()

framed('Living kid drawing sun and house', .93, 3.95, 1.72, (0, 1, 0), .45, .35, 'sun_house')
g = wall_prop('Living corkboard with pinned drawings', .60, .67, 1.62, (-1, 0, 0))
g.box((0, -.006, 0), (.56, .012, .38), D['kraft'])
for u, v, motif in [(-.17, .03, 'pet'), (.02, -.04, 'flower'), (.19, .05, 'heart')]:
    art(g, u, v, .15, .20, motif, -.013, False)
    g.box((u, -.03, v + .085), (.012, .012, .012), D['coral'])
g.done()
g = prop('Living side table trailing plant', 3.60, .50, down(3.60, .50, 1.0))
plant(g, 0, 0, 0, .09, .14, trailing=True, count=30)
g.done()

# Foyer: the family's gathering spot (Pet & family, Furnish & decorate).
g = prop('Foyer round mustard rug', 5.60, 2.10, down(5.60, 2.10, .30) + .0015)
g.cyl((0, 0, .004), 1.10, .008, D['mustard'], 36)
g.flat(ngon(.95, 36), .0092, D['cream'])
g.flat(ngon(.45, 32), .0104, D['mustard'])
g.flat(ngon(.30, 28), .0116, D['cream'])
for k in range(10):
    a = k * math.tau / 10
    g.flat(ngon(.06, 10, .72 * math.cos(a), .72 * math.sin(a)), .0104, D['teal'])
g.done()

z0 = down(7.55, -.90, .30)
g = prop('Entry shoe bench', 7.55, -.90, z0, 90, blocking=True)
g.soft((0, 0, .43), (1.0, .38, .05), D['wood'], .012)
g.box((0, 0, .13), (.94, .34, .025), D['wood'])
for x in (-.45, .45):
    for y in (-.15, .15):
        g.box((x, y, .21), (.045, .045, .42), D['wood'])
g.done()
g = prop('Entry pairs of small shoes', 7.22, -.90, z0, 90)
for k, mat in enumerate([D['coral'], D['corn'], D['rose']]):
    for side in (-.055, .055):
        g.soft((-.30 + k * .30 + side, 0, .035), (.09, .22, .07), mat, .03, (0, 0, _rng.uniform(-.15, .15)))
g.done()
g = wall_prop('Entry coat hooks with coats and bag', 7.30, -.90, 1.55, (1, 0, 0))
g.box((0, -.015, 0), (.80, .03, .08), D['wood'])
for x in (-.28, -.02, .24):
    g.box((x, -.05, -.01), (.018, .05, .018), D['ink'])
g.soft((-.28, -.07, -.24), (.34, .09, .44), D['teal'], .04)
g.soft((-.28, -.07, -.52), (.30, .07, .18), D['teal'], .03)
g.soft((-.02, -.07, -.27), (.32, .09, .50), D['coral'], .04)
g.soft((.24, -.07, -.18), (.26, .11, .30), D['mustard'], .05)
g.soft((.24, -.125, -.14), (.22, .02, .14), D['corn'], .01)
g.done()
g, _ = rug_on('Entry doormat', 5.55, -.90, .30, .60, .90, D['kraft'], D['coral'], .06)
g.done()
zc = down(4.45, .32, 1.6)
g = prop('Entry chest top bowl plant and pet picture', 4.45, .32, zc)
g.cyl((-.25, -.02, .022), .06, .044, D['teal'], 14, top=.085)
for dx in (-.02, .02):
    g.box((-.25 + dx, -.02, .045), (.03, .012, .004), D['mustard'])
plant(g, .22, -.02, 0, .07, .10, .24, 18)
p = Geo(g.root, g.name)
art(p, 0, .10, .22, .16, 'pets3', 0, True)
g.merge(p, (0, .06, .02), (-.18, 0, 0))
g.box((0, .10, .045), (.05, .05, .09), D['wood'], (.35, 0, 0))
g.done()
framed('Entry framed hill landscape', 4.45, .60, 1.85, (0, -1, 0), .60, .45, 'landscape')

# Kitchen: counters in use, fridge drawings, herb pots and the pet's corner.
zk = down_max(1.15, 6.00, .30, .25, .6)
g, _ = rug_on('Kitchen striped runner', 1.15, 6.00, .30, .65, 1.60, D['cream'], None, z=zk,
              stripes=[(-.32, y - .04, .32, y + .04, D['teal']) for y in (-.64, -.32, 0, .32, .64)], nx=3, ny=8)
g.done()
zm = down_max(2.85, 7.15, .30, .2, .14)
g, _ = rug_on('Kitchen pet feeding mat', 2.85, 7.15, .30, .60, .42, D['teal'], None, z=zm,
              motifs=[(ngon(.035, 10, dx, dy), D['cream']) for dx, dy in [(.18, .08), (.13, .13), (.20, .15), (.25, .11)]]
              + [(ngon(.05, 12, .19, .05), D['cream'])], nx=2, ny=2)
g.done()
g = prop('Kitchen fruit bowl', 1.00, 4.84, down(1.00, 4.84, 1.3))
g.cyl((0, 0, .035), .08, .07, D['cream'], 16, top=.15, caps=(True, False))
for x, y, mat, r in [(-.05, .03, D['coral'], .042), (.05, .04, D['coral'], .040), (.0, -.05, D['coral'], .041),
                     (.07, -.03, D['mustard'], .043)]:
    g.ball((x, y, .07), r, mat, 10, 6)
for k in (-1, 1):
    g.ball((-.01, k * .02, .105), (.09, .022, .022), D['mustard'], 8, 5, (0, .25 * k, .5))
g.done()
g = prop('Kitchen kettle', 1.93, 4.72, down(1.93, 4.72, 1.3))
g.cyl((0, 0, .08), .095, .16, D['cream'], 16, top=.07)
g.cyl((0, 0, .168), .05, .016, D['teal'], 12)
g.box((0, .10, .12), (.022, .03, .10), D['teal'])
g.box((0, .075, .175), (.022, .06, .02), D['teal'])
g.box((0, -.11, .10), (.025, .08, .025), D['cream'], (-.6, 0, 0))
g.done()
g = prop('Kitchen dish rack', .40, 6.76, down(.40, 6.76, 1.3))
g.box((0, 0, .012), (.28, .42, .024), D['teal'])
for k in range(4):
    g.cyl((.02, -.13 + k * .07, .125), .10, .012, D['paper'] if k % 2 else D['cream'], 16, rot=(math.pi / 2, 0, 0))
for y, mat in [(.14, D['corn']), (.17, D['rose'])]:
    g.cyl((-.08, y, .065), .034, .08, mat, 12)
g.done()
g = prop('Kitchen utensil crock', .35, 4.80, down(.35, 4.80, 1.3))
g.cyl((0, 0, .065), .05, .13, D['terra'], 12)
for k in range(4):
    g.box((.015 * math.cos(k * 1.6), .015 * math.sin(k * 1.6), .17), (.014, .03, .16), D['wood'],
          (_rng.uniform(-.15, .15), _rng.uniform(-.15, .15), 0))
g.done()
for x, z, motif in [(2.93, 1.45, 'sun_house'), (2.42, 1.62, 'pet'), (2.95, 1.05, 'rainbow')]:
    g = wall_prop('Kitchen fridge drawing ' + motif, x, 5.95, z, (0, -1, 0))
    art(g, 0, 0, .21, .28, motif, 0, False, rot=(0, _rng.uniform(-.09, .09), 0))
    g.cyl((0, -.012, .12), .016, .012, D['mustard'], 10, rot=(math.pi / 2, 0, 0))
    g.done()
g = prop('Kitchen window herb pots', 1.75, 7.72, down(1.75, 7.72, 1.3))
for dx in (-.30, 0, .30):
    plant(g, dx, 0, 0, .065, .10, .20, 14)
g.done()
g = prop('Kitchen treat jar and cookbook', 3.13, 7.72, down(3.13, 7.72, 1.3))
g.cyl((0, 0, .07), .06, .14, D['paper'], 14)
g.cyl((0, 0, .15), .064, .02, D['teal'], 14)
g.box((-.62, .06, .10), (.30, .02, .20), D['wood'], (-.35, 0, 0))
g.box((-.69, .03, .12), (.14, .01, .19), D['paper'], (-.35, 0, .12))
g.box((-.55, .03, .12), (.14, .01, .19), D['paper'], (-.35, 0, -.12))
g.done()
g = wall_prop('Kitchen garage door jackets', .25, 7.50, 1.10, (0, 1, 0))
g.soft((-.12, -.06, -.20), (.30, .085, .46), D['corn'], .04)
g.soft((.14, -.06, -.23), (.30, .085, .50), D['coral'], .04)
g.done()

# Dining: rug, table runner and flowers, the family quest board.
g, _ = rug_on('Dining teal striped rug', 5.52, 6.38, .30, 2.6, 1.9, D['cream'], D['teal'], .09,
              stripes=[(-1.21, y - .035, 1.21, y + .035, D['teal']) for y in (-.45, 0, .45)], nx=8, ny=6)
g.done()
zt = down(5.52, 6.38, 1.2)
g = prop('Dining table runner and flower jug', 5.52, 6.38, zt)
g.box((0, 0, .002), (1.60, .32, .004), D['cream'])
for x in (-.76, .76):
    g.box((x, 0, .003), (.08, .32, .004), D['coral'])
g.cyl((.10, 0, .085), .06, .16, D['corn'], 14, top=.045)
for k in range(5):
    a = k * math.tau / 5
    flower(g, .10 + .03 * math.cos(a), .03 * math.sin(a), .15, .12 + .03 * (k % 2), FLOWERS[k % 3])
g.cyl((-.40, .02, .005), .06, .01, D['paper'], 14)
g.done()
g = wall_prop('Dining family quest board', 6.80, 7.40, 1.45, (0, 1, 0))
g.box((0, -.01, 0), (.90, .02, .60), D['kraft'])
for dx in (-1, 1):
    g.box((dx * .46, -.018, 0), (.03, .03, .64), D['wood'])
for dz in (-1, 1):
    g.box((0, -.018, dz * .315), (.95, .03, .03), D['wood'])
for k, (u, v) in enumerate([(-.30, .14), (-.05, .15), (.21, .12), (-.28, -.12), (.0, -.13), (.26, -.14)]):
    g.box((u, -.022, v), (.16, .004, .11), [D['paper'], D['mustard'], D['corn'], D['rose'], D['teal'], D['paper']][k])
    g.box((u, -.028, v + .045), (.012, .006, .012), D['coral'])
for u, v in [(-.36, .26), (.32, .25), (.38, -.02)]:
    g.vflat(star(.045, .02, cx=u, cy=v), -.026, D['mustard'])
g.done()
zc = down(7.52, 6.20, 1.8)
g = prop('Dining chest plant and board games', 7.52, 6.20, zc)
plant(g, 0, -.60, 0, .08, .12, trailing=True, count=26)
for k, mat in enumerate([D['coral'], D['corn'], D['mustard']]):
    g.box((0, .50, .025 + k * .05), (.22, .30, .048), mat, (0, 0, _rng.uniform(-.12, .12)))
g.done()
zp = down(4.05, 4.62, .60)
g = prop('Dining playpen blanket and soft toys', 4.05, 4.62, zp)
g.soft((0, .10, .015), (.50, .36, .03), D['corn'], .012)
teddy(g, .05, -.15, .01, D['mustard'], s=.6)
g.soft((-.18, .22, .06), (.10, .10, .10), D['rose'], .03, (0, 0, .4))
g.done()

# Sunroom = Rainbow studio: easel, a washing line of paintings, filled shelves.
zs = down(5.85, 9.60, .30)
g, _ = rug_on('Sunroom rainbow stripe mat', 5.85, 9.60, .30, .80, 1.20, D['cream'], None, z=zs, nx=2, ny=5,
              stripes=[(-.40, -.60 + k * .24, .40, -.60 + (k + 1) * .24, m) for k, m in
                       enumerate([D['coral'], D['mustard'], D['teal'], D['corn'], D['rose']])])
g.done()
g = prop('Sunroom kids easel with rainbow painting', 5.97, 9.60, zs + .011, -90, blocking=True)
for x in (-.25, .25):
    g.box((x, -.05, .56), (.035, .035, 1.14), D['wood'], (-.12, 0, 0))
g.box((0, .24, .52), (.035, .035, 1.06), D['wood'], (.32, 0, 0))
g.box((0, -.13, .66), (.60, .08, .02), D['wood'])
for k, mat in enumerate([D['coral'], D['mustard'], D['teal'], D['corn']]):
    g.cyl((-.2 + k * .13, -.13, .69), .025, .04, mat, 10)
board = Geo(g.root, g.name)
board.box((0, .005, 0), (.58, .01, .48), D['wood'])
art(board, 0, 0, .54, .44, 'rainbow', -.001, False)
g.merge(board, (0, -.085, .96), (-.12, 0, 0))
g.done()
g = wall_prop('Sunroom washing line of paintings', 3.65, 8.80, 1.55, (0, -1, 0))
for k in range(3):
    x0, x1 = -.78 + k * .52, -.78 + (k + 1) * .52
    s0, s1 = .05 * math.sin(math.pi * (k / 3)), .05 * math.sin(math.pi * ((k + 1) / 3))
    g.box(((x0 + x1) / 2, -.03, -(s0 + s1) / 2), (.53, .006, .006), D['cream'], (0, (s1 - s0) / .52, 0))
for x in (-.79, .79):
    g.box((x, -.015, 0), (.025, .03, .04), D['wood'])
for k, motif in enumerate(['rainbow', 'sun_house', 'flower', 'pet', 'heart']):
    x = -.60 + k * .30
    sag = .05 * math.sin(math.pi * (x + .78) / 1.56)
    art(g, 0, 0, .20, .26, motif, 0, False, at=(x, -.034, -sag - .135), rot=(0, _rng.uniform(-.06, .06), 0))
    g.box((x, -.04, -sag - .005), (.014, .012, .04), D['wood'])
g.done()
g = prop('Sunroom etagere shelf baskets books and plant', 5.83, 8.46, 0)
zs1, zs2, zs3, zs4 = (down(5.83, 8.46, z) for z in (.25, .66, 1.08, 1.47))
book_row(g, -.26, .02, zs1, .50, .20, hmin=.16, hmax=.24)
for dx, mat in [(-.14, D['coral']), (.14, D['teal'])]:
    g.cyl((dx, .02, zs2 + .06), .10, .12, D['kraft'], 12, top=.11, caps=(True, False))
    for k in range(5):
        g.box((dx + _rng.uniform(-.05, .05), .02 + _rng.uniform(-.04, .04), zs2 + .15), (.01, .01, .14),
              [D['coral'], D['mustard'], D['teal'], D['corn'], mat][k], (_rng.uniform(-.2, .2), _rng.uniform(-.2, .2), 0))
g.box((-.1, .02, zs3 + .015), (.30, .22, .03), D['paper'])
g.cyl((.15, .02, zs3 + .05), .04, .10, D['corn'], 12)
plant(g, 0, .02, zs4, .08, .11, trailing=True, count=26)
g.done()
g = prop('Sunroom hanging planter', 6.90, 11.15, 0)
for k in range(3):
    a = k * math.tau / 3
    top, low = Vector((0, 0, 2.30)), Vector((.10 * math.cos(a), .10 * math.sin(a), 1.80))
    mid = (top + low) / 2
    g.box(tuple(mid), (.006, .006, (top - low).length), D['cream'],
          (Vector((0, 0, 1)).rotation_difference((top - low).normalized()).to_euler()))
plant(g, 0, 0, 1.62, .10, .18, trailing=True, count=36)
g.done()

# Porch: flower pots and a doormat outside the red door.
for name, x, y in [('Porch corner flower pot', .35, -.42), ('Porch rail flower pot', 2.40, -1.48)]:
    zq = down(x, y, .40)
    g = prop(name, x, y, zq, blocking=True)
    g.cyl((0, 0, .16), .15, .32, D['terra'], 14, top=.19)
    g.cyl((0, 0, .30), .17, .02, D['soil'], 14)
    for k in range(7):
        a = k * math.tau / 7 + _rng.uniform(0, .4)
        flower(g, .09 * math.cos(a), .09 * math.sin(a), .31, _rng.uniform(.14, .24), FLOWERS[k % 3])
    g.leaves((0, 0, .38), 16, .12, .06, zspread=.05)
    g.done()
g, _ = rug_on('Porch doormat', 4.72, -.90, .30, .45, .80, D['kraft'], D['teal'], .05, nx=2, ny=3)
g.done()


def small_toy(g, x, y, z, r, fur, ears=True):
    g.ball((x, y, z + r), r, fur, 8, 5)
    if ears:
        for dx in (-1, 1):
            g.ball((x + dx * r * .6, y, z + r * 1.8), r * .32, fur, 6, 4)
    for dx in (-1, 1):
        g.ball((x + dx * r * .35, y - r * .9, z + r * 1.15), r * .12, D['ink'], 5, 3)


# ================================================================== UPSTAIRS
_use('upper')

g, _ = rug_on('Upstairs hall striped runner', 13.30, 4.01, 1.60, 3.6, .70, D['cream'], D['corn'], .07, nx=10, ny=2,
              motifs=[(diamond(x, 0, .07), D['corn']) for x in (-1.2, -.4, .4, 1.2)])
g.done()
framed('Upstairs hall pet drawing', 13.35, 3.90, 2.75, (0, -1, 0), .30, .38, 'pet')
framed('Upstairs hall flower drawing', 13.85, 3.90, 2.52, (0, -1, 0), .34, .26, 'flower')
framed('Upstairs hall rainbow drawing', 12.52, 4.10, 2.70, (0, 1, 0), .28, .36, 'rainbow')
g = wall_prop('Upstairs hall hook jackets and backpack', 14.64, 3.95, 2.45, (0, -1, 0))
g.soft((-.25, -.10, -.04), (.30, .085, .50), D['teal'], .04)
g.soft((.05, -.10, -.06), (.30, .085, .52), D['coral'], .04)
g.soft((.30, -.11, .05), (.24, .10, .30), D['mustard'], .05)
g.soft((.30, -.165, .03), (.20, .02, .13), D['corn'], .01)
g.done()

# Green bathroom = Bath time: mat, towels, duck and toys, toothbrushes, a plant.
g, _ = rug_on('Green bathroom bath mat', 11.10, 6.10, 1.60, .50, .80, D['cream'], D['teal'], .05, footprint=True,
              stripes=[(-.20, y - .03, .20, y + .03, D['teal']) for y in (-.18, 0, .18)], nx=2, ny=3)
g.done()
g = wall_prop('Green bathroom hook towels', 11.04, 6.50, 2.30, (0, 1, 0))
for x, mat in [(-.18, D['coral']), (.18, D['mustard'])]:
    g.soft((x, -.075, -.02), (.32, .03, .50), mat, .012)
    g.soft((x, -.075, .22), (.30, .05, .07), mat, .02)
g.done()
g = prop('Green bathroom rubber duck and toy boat', 11.49, 6.78, down(11.49, 6.78, 2.2))
g.ball((0, -.12, .05), (.055, .075, .05), D['mustard'], 10, 6)
g.ball((0, -.17, .10), .035, D['mustard'], 8, 5)
g.cyl((0, -.205, .095), .013, .03, D['coral'], 8, top=.003, rot=(math.pi / 2, 0, 0))
for dx in (-1, 1):
    g.ball((dx * .018, -.19, .112), .006, D['ink'], 5, 3)
g.box((0, .16, .02), (.07, .15, .04), D['corn'])
g.box((0, .16, .09), (.006, .006, .10), D['ink'])
g.raw([(0, .11, .05), (0, .20, .05), (0, .16, .14)], [(0, 1, 2)], D['paper'], both=True)
g.done()
g = prop('Green bathroom stacking bath cups', 11.85, 6.55, down(11.85, 6.55, 2.0))
for k, (r, mat) in enumerate([(.045, D['coral']), (.038, D['teal']), (.031, D['mustard'])]):
    g.cyl((0, 0, .03 + k * .045), r, .06, mat, 12, top=r * 1.15)
g.done()
g = prop('Green bathroom toothbrush cup', 10.15, 5.18, down(10.15, 5.18, 2.4))
g.cyl((0, 0, .05), .035, .10, D['teal'], 12)
for k, mat in enumerate([D['coral'], D['mustard'], D['corn'], D['rose']]):
    a = k * math.tau / 4
    g.box((.012 * math.cos(a), .012 * math.sin(a), .13), (.012, .012, .19), mat, (.14 * math.sin(a), -.14 * math.cos(a), 0))
g.done()
g = prop('Green bathroom soap pump', 10.15, 6.12, down(10.15, 6.12, 2.4))
g.cyl((0, 0, .06), .034, .12, D['cream'], 12)
g.box((0, 0, .135), (.018, .018, .03), D['ink'])
g.box((0, -.02, .15), (.016, .05, .012), D['ink'])
g.done()
g = prop('Green bathroom linen shelf plant', 10.12, 4.87, down(10.12, 4.87, 3.45))
plant(g, 0, 0, 0, .065, .09, trailing=True, count=20)
g.done()
framed('Green bathroom whale picture', 10.40, 6.50, 2.42, (-1, 0, 0), .40, .30, 'whale')

# Mom & Dad's bedroom = Wardrobe: rug, bed cushions and throw, closet garments and hats.
g, _ = rug_on('Primary bedroom rose rug', 13.30, 6.40, 1.60, 1.6, 2.2, D['rose'], D['cream'], .09,
              z=down(12.70, 6.40, 1.50), motifs=[(diamond(x, y, .12), D['cream']) for x, y in [(-.45, -.6), (-.45, .6)]])
g.done()
# The bed head is on the entry wall (House Tour 138.508/139.577s): cushions in
# front of the pillows, the throw across the foot toward the TV dresser.
zb = down(14.63, 5.29, 2.5)
g = prop('Primary bed cushions', 14.63, 5.29, zb, -90)
for dy, mat in [(-.35, D['rose']), (.35, D['corn'])]:
    g.soft((0, dy, .18), (.13, .42, .38), mat, .05, (0, .30, 0))
g.done()
zf = down(14.63, 6.30, 2.5)
g = prop('Primary bed foot folded throw', 14.63, 6.30, zf, 90)
g.soft((0, 0, .015), (.45, 1.82, .03), D['rose'], .012)
for dy in (-.915, .915):
    g.soft((0, dy, -.13), (.45, .03, .30), D['rose'], .012)
g.done()
g = prop('Primary closet hanging garments', 12.64, 4.85, 1.26)
for x, mat in [(-.24, D['coral']), (-.08, D['teal']), (.08, D['rose']), (.24, D['mustard'])]:
    g.box((x, 0, 1.645), (.20, .012, .012), D['ink'])
    g.soft((x, 0, 1.33), (.22, .07, .60), mat, .03)
g.done()
zh = down(12.64, 4.86, 3.40)
g = prop('Primary closet shelf hats', 12.64, 4.86, zh)
g.cyl((-.17, 0, .006), .16, .012, D['mustard'], 18)
g.cyl((-.17, 0, .05), .075, .08, D['mustard'], 14, top=.065)
g.cyl((-.17, 0, .025), .077, .018, D['coral'], 14)
g.ball((.17, 0, .03), (.085, .085, .05), D['corn'], 10, 6)
g.box((.17, -.10, .006), (.10, .08, .01), D['corn'])
g.done()
zc = down(12.525, 6.91, 2.8)
g = prop('Primary chest top mug books and plant', 12.525, 6.91, zc, 90)
g.cyl((-.30, -.02, .045), .04, .09, D['rose'], 12)
g.box((-.35, -.02, .05), (.012, .02, .05), D['rose'])
for k, mat in enumerate([D['corn'], D['coral'], D['teal']]):
    g.box((.06, 0, .016 + k * .032), (.20 - k * .02, .14, .03), mat, (0, 0, _rng.uniform(-.2, .2)))
plant(g, .36, .02, 0, .06, .09, .22, 16)
g.done()
framed('Primary bedroom abstract picture', 12.80, 6.10, 2.75, (-1, 0, 0), .70, .50, 'abstract')
g = prop('Primary narrow chest plant', 13.55, 8.10, down(13.55, 8.10, 2.6))
plant(g, 0, 0, 0, .08, .12, .30, 24)
g.done()

# Kieran's nursery = Rest: round rug, teddy, bunny, floor toys, mobile, bunting.
zr = down(12.85, 2.45, 1.6)
g = prop('Kieran nursery round rug', 12.85, 2.45, zr + .0015)
g.cyl((0, 0, .004), .75, .008, D['corn'], 32)
g.flat(ngon(.62, 32), .0092, D['cream'])
g.flat(star(.24, .10), .0104, D['mustard'])
for k in range(8):
    a = k * math.tau / 8
    g.flat(ngon(.04, 8, .45 * math.cos(a), .45 * math.sin(a)), .0104, D['corn'])
g.done()
g = prop('Kieran rocker teddy bear', 13.09, 1.36, down(13.09, 1.36, 2.2), 180)
teddy(g, 0, 0, 0, D['mustard'], s=.8)
g.done()
g = prop('Kieran crib plush bunny', 11.56, 2.40, down(11.56, 2.40, 2.3), 90)
g.ball((0, 0, .08), (.07, .06, .085), D['rose'], 8, 5)
g.ball((0, -.01, .20), .058, D['rose'], 8, 5)
for dx in (-1, 1):
    g.ball((dx * .025, 0, .30), (.018, .012, .07), D['rose'], 6, 4)
    g.ball((dx * .02, -.055, .215), .007, D['ink'], 5, 3)
g.done()
zt = zr + .012
g = prop('Kieran nursery stacking rings blocks and ball', 13.30, 2.60, zt)
g.cyl((0, 0, .01), .07, .02, D['wood'], 14)
g.cyl((0, 0, .11), .012, .20, D['wood'], 8)
for k, (r, mat) in enumerate([(.065, D['coral']), (.057, D['mustard']), (.049, D['teal']), (.041, D['corn'])]):
    g.cyl((0, 0, .038 + k * .036), r, .034, mat, 14)
g.soft((.25, -.35, .045), (.09, .09, .09), D['coral'], .025)
g.soft((.36, -.29, .045), (.09, .09, .09), D['corn'], .025, (0, 0, .5))
g.soft((.30, -.32, .135), (.09, .09, .09), D['mustard'], .025, (0, 0, .3))
g.ball((-.35, .30, .08), .08, D['teal'])
g.done()
g = wall_prop('Kieran flag bunting over the crib', 11.60, 2.10, 2.92, (-1, 0, 0))
for k in range(3):
    x0, x1 = -.62 + k * .413, -.62 + (k + 1) * .413
    s0, s1 = .06 * math.sin(math.pi * k / 3), .06 * math.sin(math.pi * (k + 1) / 3)
    g.box(((x0 + x1) / 2, -.02, -(s0 + s1) / 2), (.42, .005, .005), D['cream'], (0, (s1 - s0) / .413, 0))
for k, mat in enumerate([D['coral'], D['mustard'], D['teal'], D['corn'], D['rose'], D['mustard']]):
    x = -.52 + k * .208
    s = .06 * math.sin(math.pi * (x + .62) / 1.24)
    g.vflat([(x - .08, -s), (x, -s - .15), (x + .08, -s)], -.024, mat)
g.done()
g = prop('Kieran crib mobile', 11.56, 2.10, 1.26)
g.box((-.36, 0, 1.41), (.015, .015, .56), D['wood'])
g.box((-.18, 0, 1.69), (.37, .012, .012), D['wood'])
g.cyl((0, 0, 1.675), .02, .02, D['wood'], 10)
for k, (shape, mat) in enumerate([(star(.06, .026), D['mustard']), (ngon(.05, 14), D['cream']),
                                  (ngon(.045, 12, sx=1.5), D['corn']), (star(.05, .022), D['rose'])]):
    a = k * math.tau / 4
    x, y = .16 * math.cos(a), .16 * math.sin(a)
    g.box((x, y, 1.575), (.003, .003, .19), D['ink'])
    g.vflat(shape, 0, mat, at=(x, y, 1.43), rot=(0, 0, a), both=True)
g.done()
framed('Kieran moon and stars picture', 14.20, 1.20, 2.95, (0, -1, 0), .50, .40, 'moon')
zra = down(13.37, 1.25, 2.3)
g = prop('Kieran rocker arm knit blanket', 13.37, 1.25, zra)
g.soft((0, 0, .012), (.14, .34, .03), D['corn'], .01)
g.soft((.075, 0, -.13), (.03, .34, .28), D['corn'], .01)
g.done()
g = prop('Kieran chest top plant', 14.45, .70, down(14.45, .70, 3.0))
plant(g, 0, 0, 0, .08, .12, .30, 22)
g.done()

# Cory's bedroom: a 100-square number grid, block tower, full bookcase, abacus.
zg = down(17.20, 3.20, 1.6)
g = prop('Cory hundred square number grid mat', 17.20, 3.20, zg + .0015)
g.rug(-.75, -.75, .75, .75, 0, .006, D['cream'], 5, 5)
for j in range(10):
    for i in range(10):
        n = j * 10 + i + 1
        mat = D['coral'] if n % 10 == 0 else D['mustard'] if n % 5 == 0 else (D['corn'] if (i + j) % 2 == 0 else None)
        if mat:
            x, y = -.675 + i * .15, -.675 + j * .15
            g.flat([(x - .065, y - .065), (x + .065, y - .065), (x + .065, y + .065), (x - .065, y + .065)], .0072, mat)
g.done()
g = prop('Cory block tower tree and loose blocks', 17.95, 3.90, zg)
for z in (.06, .18):
    g.box((0, 0, z), (.12, .12, .12), D['wood'])
for x, y, z in [(0, 0, .30), (.12, 0, .30), (-.12, 0, .30), (0, .12, .30), (0, -.12, .30), (0, 0, .42)]:
    g.box((x, y, z), (.12, .12, .12), D['teal'])
for x, y, mat in [(-.35, -.25, D['coral']), (-.55, .10, D['mustard']), (-.62, -.18, D['corn']), (-.42, .25, D['teal'])]:
    g.box((x, y, .06), (.12, .12, .12), mat, (0, 0, _rng.uniform(0, 1.5)))
g.done()
g = prop('Cory bookcase books and puzzle cubes', 18.49, 3.34, 0)
for i in range(1, 8):
    zs = down(18.49, 3.34, 1.26 + .06 + i * .167 + .12, .4)
    if i == 7:
        g.box((0, -.30, zs + .03), (.06, .06, .06), D['coral'], (0, 0, .3))
        g.box((0, -.18, zs + .03), (.06, .06, .06), D['teal'], (0, 0, .7))
        book_row(g, 0, 0, zs, .38, .16, 'y', .10, .14)
    else:
        start = _rng.uniform(-.41, -.30)
        book_row(g, 0, start, zs, _rng.uniform(.45, .78), .16, 'y', .10, .15)
g.done()
zd = down(16.36, 5.92, 2.4)
g = prop('Cory desk maths workbook pencils and abacus', 16.36, 5.92, zd)
g.box((-.26, .03, .002), (.30, .22, .004), D['paper'])
for k in range(6):
    g.flat([(-.40 + k * .052, -.075), (-.397 + k * .052, -.075), (-.397 + k * .052, .135), (-.40 + k * .052, .135)], .0045, D['ink'])
for k in range(5):
    g.flat([(-.40, -.07 + k * .05), (-.12, -.07 + k * .05), (-.12, -.067 + k * .05), (-.40, -.067 + k * .05)], .0045, D['ink'])
g.box((-.05, -.06, .006), (.16, .012, .012), D['mustard'], (0, 0, .4))
g.cyl((.20, .14, .05), .04, .10, D['corn'], 12)
for k, mat in enumerate([D['coral'], D['mustard'], D['teal'], D['rose']]):
    g.box((.20 + .012 * math.cos(k * 1.6), .14 + .012 * math.sin(k * 1.6), .12), (.012, .012, .16), mat,
          (_rng.uniform(-.15, .15), _rng.uniform(-.15, .15), 0))
for dx in (-.16, .16):
    g.box((.49 + dx, .06, .11), (.02, .08, .22), D['wood'])
g.box((.49, .06, .01), (.34, .08, .02), D['wood'])
for r, (z, mat) in enumerate([(.07, D['coral']), (.12, D['mustard']), (.17, D['teal'])]):
    g.box((.49, .06, z), (.30, .006, .006), D['ink'])
    for b in range(5):
        g.cyl((.38 + b * .03 + (r * .02), .06, z), .018, .025, mat, 6, rot=(0, math.pi / 2, 0))
plant(g, -.58, .18, 0, .045, .06, .12, 8)
g.done()
g = wall_prop('Cory multiplication grid poster', 16.36, 5.90, 2.55, (0, 1, 0))
art(g, 0, 0, .60, .80, 'grid', 0, False)
for u, v in [(-.28, .38), (.28, .38)]:
    g.box((u, -.012, v), (.015, .01, .015), D['coral'])
g.done()
g = prop('Cory hammock plush toys', 18.27, .98, 2.95)
for x, y, z, r, mat in [(0, 0, .0, .08, D['coral']), (.10, .17, .02, .07, D['teal']), (-.12, -.13, .02, .07, D['mustard'])]:
    small_toy(g, x, y, z, r, mat)
g.done()
g = prop('Cory ottoman cushion', 18.25, .72, down(18.25, .72, 2.3))
g.soft((0, 0, .045), (.28, .28, .09), D['coral'], .04)
g.done()
g = prop('Cory toy truck ball and blocks', 16.90, 1.90, down(16.90, 1.90, 1.6))
g.box((-.30, -.05, .075), (.10, .10, .09), D['mustard'])
g.box((-.17, -.05, .055), (.16, .12, .05), D['coral'])
for x in (-.33, -.14):
    for y in (-.115, .015):
        g.cyl((x, y, .03), .03, .02, D['ink'], 10, rot=(math.pi / 2, 0, 0))
g.ball((.20, -.10, .08), .08, D['corn'])
g.box((.50, .15, .05), (.10, .10, .10), D['teal'], (0, 0, .4))
g.box((.58, .02, .05), (.10, .10, .10), D['coral'], (0, 0, .9))
g.done()


def basket(g, x, y, z, w, d, h, mat=None):
    mat = mat or D['kraft']
    for bx, by, sx, sy in [(-w / 2 + .01, 0, .02, d), (w / 2 - .01, 0, .02, d), (0, -d / 2 + .01, w, .02), (0, d / 2 - .01, w, .02)]:
        g.box((x + bx, y + by, z + h / 2), (sx, sy, h), mat)
    g.box((x, y, z + .015), (w - .02, d - .02, .03), mat)


def lean_art(g, x, y, z, w, h, motif, tilt=-.14):
    p = Geo(g.root, g.name)
    art(p, 0, h / 2 + .02, w, h, motif, 0, True)
    g.merge(p, (x, y, z), (tilt, 0, 0))


# ================================================================== LOWER WING
_use('lower')

# Family room = Play together: rug, a board game in progress, throw, toys, plant.
g, zrug = rug_on('Family room teal geometric rug', 12.60, 2.20, -.80, 2.2, 1.6, D['teal'], D['mustard'], .09,
                 stripes=[(-.93, -.63, .93, -.60, D['cream']), (-.93, .60, .93, .63, D['cream']),
                          (-.93, -.63, -.90, .63, D['cream']), (.90, -.63, .93, .63, D['cream'])],
                 motifs=[(diamond(x, y, .10), D['mustard']) for x in (-.78, .78) for y in (-.47, .47)], nx=8, ny=6)
g.done()
zt = down(12.47, 2.27, -.25)
g = prop('Family room board game in progress', 12.47, 2.27, zt)
g.box((0, -.05, .003), (.36, .36, .006), D['paper'])
for (dx, dy), mat in zip([(-.085, -.135), (.085, -.135), (-.085, .035), (.085, .035)],
                         [D['coral'], D['mustard'], D['teal'], D['corn']]):
    g.flat([(dx - .07, dy - .07), (dx + .07, dy - .07), (dx + .07, dy + .07), (dx - .07, dy + .07)], .0065, mat)
    g.cyl((dx * .6, dy * .6 - .02, .027), .014, .04, mat, 10, top=.008)
    g.ball((dx * .6, dy * .6 - .02, .052), .012, mat, 8, 5)
g.box((.22, -.08, .015), (.03, .03, .03), D['cream'], (0, 0, .5))
for x, y, mat in [(-.17, .30, D['coral']), (.15, .33, D['teal'])]:
    g.cyl((x, y, .045), .038, .09, mat, 12)
    g.box((x + .045, y, .05), (.012, .02, .05), mat)
g.done()
g = prop('Family sofa throw and cushions', 12.85, .12, -1.05)
g.soft((0, 0, 1.055), (.90, .20, .03), D['mustard'], .012)
g.soft((0, .115, .85), (.90, .03, .40), D['mustard'], .012)
for x, mat in [(-.45, D['coral']), (.55, D['cream'])]:
    g.soft((x, .30, .77), (.40, .13, .38), mat, .05, (.25, 0, 0))
g.done()
g = prop('Family room toy basket with balls', 11.80, 2.85, zrug, blocking=True)
basket(g, 0, 0, 0, .36, .30, .24)
g.ball((-.07, 0, .27), .08, D['coral'])
g.ball((.08, .03, .26), .07, D['corn'])
g.box((.02, -.08, .25), (.22, .04, .04), D['teal'], (0, .5, .3))
g.done()
zm = down(14.40, 1.33, .9)
g = prop('Family mantel flower vase', 14.40, 1.33, zm)
g.cyl((0, 0, .09), .05, .18, D['corn'], 14, top=.035)
for k in range(3):
    flower(g, .02 * math.cos(k * 2.1), .02 * math.sin(k * 2.1), .17, .10 + .03 * k, FLOWERS[k])
g.done()
g = prop('Family mantel leaning drawing and candles', 14.40, 3.24, down(14.40, 3.24, .9), -90)
lean_art(g, 0, .03, 0, .20, .25, 'pets3')
for dx in (-.14, .14):
    g.cyl((dx, 0, .06), .025, .12, D['cream'], 12)
g.done()
g = prop('Family room leaning landscape print', 13.07, 4.50, down(13.07, 4.45, .9))
lean_art(g, 0, 0, 0, .60, .45, 'landscape', -.12)
g.done()
g = prop('Family room corner house plant', 14.25, 3.85, down(14.25, 3.85, -.7), blocking=True)
g.cyl((0, 0, .15), .13, .30, D['terra'], 14, top=.16)
g.cyl((0, 0, .29), .15, .01, D['soil'], 14)
for k in range(3):
    g.box((.03 * math.cos(k * 2), .03 * math.sin(k * 2), .52), (.012, .012, .45), D['leaf'], (.2 * math.cos(k * 2), .2 * math.sin(k * 2), 0))
g.leaves((0, 0, .72), 34, .22, .11, zspread=.24)
g.done()

# Shared entry (Your belongings) and the downstairs bathroom.
g, _ = rug_on('Shared bedroom entry runner', 11.50, 5.60, -.70, .60, 1.60, D['corn'], D['cream'], .06, nx=2, ny=6)
g.done()
g = prop('Shared entry school backpack', 11.99, 6.45, down(11.99, 6.45, -.7))
g.soft((0, 0, .16), (.14, .26, .32), D['mustard'], .05, (0, .12, 0))
g.soft((-.075, 0, .20), (.02, .22, .13), D['corn'], .01, (0, .12, 0))
g.done()
g, _ = rug_on('Downstairs bathroom mat', 11.30, 7.55, -.70, .44, .70, D['teal'], D['cream'], .04, nx=2, ny=3)
g.done()
# House Tour 183.523s: the towel bar is on the vanity wall, between it and the door.
g = wall_prop('Downstairs bathroom hanging towel', 11.80, 6.88, -.10, (1, 0, 0))
g.box((0, -.02, .12), (.40, .03, .03), D['wood'])
g.soft((0, -.04, -.15), (.36, .03, .50), D['coral'], .012)
g.done()

# Ellie's bedroom: dresses on the rail, a crown, filled shelves, princess cushions.
# Positions follow the video-corrected furniture in basement_garage.py (House
# Tour 181-191s): rail along the far wall under its window, bed head at the far
# wall, bookcase and pink shelf on the rear wall, cabinet on the entry wall.
g = prop('Ellie dress up rail dresses and tutu', 8.13, 8.30, -1.05, 90)
for k, (x, mat) in enumerate([(-.30, D['rose']), (-.10, D['mustard']), (.10, D['corn']), (.28, D['rose'])]):
    g.box((x, 0, 1.27), (.18, .012, .012), D['ink'])
    g.soft((x, 0, 1.13), (.15, .07, .20), mat, .025)
    if k == 3:
        g.cyl((x, 0, .96), .20, .10, mat, 14, top=.08, sy=.4)
    else:
        g.cyl((x, 0, .83), .15, .40, mat, 14, top=.075, sy=.5)
g.done()
zd = down(10.555, 8.10, .5)
g = prop('Ellie dresser crown jewellery box and mirror', 10.555, 8.10, zd, -90)
g.cyl((-.20, -.02, .02), .065, .04, D['mustard'], 16, caps=(False, False))
for k in range(5):
    a = k * math.tau / 5
    g.cyl((-.20 + .058 * math.cos(a), -.02 + .058 * math.sin(a), .065), .016, .05, D['mustard'], 6, top=.001)
    g.ball((-.20 + .066 * math.cos(a), -.02 + .066 * math.sin(a), .02), .01, D['coral'], 6, 4)
g.box((.20, 0, .035), (.14, .10, .07), D['rose'])
g.box((.20, 0, .077), (.15, .11, .015), D['corn'])
g.cyl((0, -.06, .005), .05, .01, D['paper'], 14)
g.box((0, -.14, .004), (.02, .08, .008), D['wood'])
g.done()
g = prop('Ellie shelves books unicorn and snow globe', 8.01, 6.25, 0, 90)
zs1, zs2, zs3 = (down(8.01, 6.25, z) for z in (.25, .60, .95))
book_row(g, -.28, 0, zs1, .30, .11, 'x', .10, .16)
teddy(g, .18, 0, zs1, D['rose'], s=.45)
g.ball((0, 0, zs2 + .07), (.09, .055, .065), D['cream'], 8, 5)
g.ball((.08, 0, zs2 + .14), .05, D['cream'], 8, 5)
g.cyl((.10, 0, zs2 + .20), .01, .06, D['mustard'], 6, top=.001, rot=(0, .4, 0))
for k in range(3):
    g.ball((.04 - k * .03, 0, zs2 + .16 - k * .02), .02, D['rose'], 6, 4)
for dx in (-.05, .05):
    for dy in (-.03, .03):
        g.cyl((dx, dy, zs2 + .02), .01, .04, D['cream'], 6)
g.ball((-.12, 0, zs3 + .08), .05, D['paper'], 10, 6)
g.cyl((-.12, 0, zs3 + .015), .045, .03, D['rose'], 12)
g.done()
zb = down(8.63, 7.00, .2)
g = prop('Ellie princess bed cushions', 8.63, 7.00, zb, -90)
for x, mat in [(-.33, D['rose']), (0, D['corn']), (.33, D['mustard'])]:
    g.soft((x, 0, .17), (.34, .13, .32), mat, .05, (.30, 0, 0))
g.done()
zf = down(9.62, 7.00, .2)
g = prop('Ellie bed foot rose throw', 9.62, 7.00, zf, -90)
g.soft((0, 0, .015), (1.50, .45, .03), D['rose'], .012)
for dx in (-.72, .72):
    g.soft((dx, 0, -.12), (.03, .45, .28), D['rose'], .012)
g.done()
# The video's road rug now lies inside the door, so the (unphotographed)
# runner moves to the free strip along the front side of the bed.
g, _ = rug_on('Ellie princess runner', 9.00, 5.96, -.70, .70, 1.35, D['rose'], D['cream'], .06, nx=2, ny=5,
              motifs=[(star(.08, .035, cx=0, cy=y), D['mustard']) for y in (-.35, 0, .35)], angle=90)
g.done()
framed('Ellie castle drawing', 10.40, 7.30, .45, (1, 0, 0), .35, .45, 'castle')
g = prop('Ellie hammock plush toys', 8.22, 8.50, 0)
for y, mat in [(-.15, D['rose']), (.05, D['corn']), (.20, D['mustard'])]:
    small_toy(g, 0, y, .50, .07, mat)
g.done()
zt = down(9.74, 8.77, 0.0)
g = prop('Ellie pink shelf plush toys and toy castle', 9.74, 8.77, zt)
teddy(g, -.30, 0, 0, D['rose'], s=.5)
teddy(g, .30, 0, 0, D['mustard'], s=.5)
for x in (-.09, 0, .09):
    g.box((x, 0, .07 if x else .05), (.07, .07, .14 if x else .10), D['paper'])
    g.cyl((x, 0, (.16 if x else .12)), .045, .06, D['corn'], 8, top=.001)
g.done()
g = prop('Ellie small bookcase books', 8.66, 8.77, 0, 90)
for top in (-.62, -.43, -.24):
    book_row(g, 0, -.27, down(8.66, 8.77, top), .54, .16, 'y', .10, .16)
g.done()

# Jeannie's bedroom: a reading nook, trophies (Trophies & visits), READ garland.
g, _ = rug_on('Jeannie bedroom teal rug', 13.90, 6.30, -.70, 2.0, 1.5, D['cream'], D['teal'], .10,
              motifs=[(diamond(x, 0, .14), m) for x, m in [(-.5, D['teal']), (0, D['mustard']), (.5, D['teal'])]])
g.done()
zf = down(14.55, 6.95, -.7)
g = prop('Jeannie reading beanbag with open book', 14.55, 6.95, zf, blocking=True)
g.ball((0, 0, .22), (.36, .36, .26), D['teal'], 14, 8)
g.box((.06, -.05, .47), (.13, .19, .01), D['paper'], (0, -.18, .3))
g.box((-.07, -.03, .47), (.13, .19, .01), D['paper'], (0, .18, .3))
g.box((0, -.04, .462), (.28, .20, .006), D['corn'], (0, 0, .3))
g.done()
g = prop('Jeannie reading cushion', 13.85, 7.10, down(13.85, 7.10, -.7))
g.soft((0, 0, .06), (.48, .48, .12), D['mustard'], .05)
g.done()
g = prop('Jeannie book stack', 13.45, 7.35, down(13.45, 7.35, -.7))
for k, mat in enumerate([D['coral'], D['corn'], D['teal'], D['rose']]):
    g.box((0, 0, .018 + k * .036), (.22 - k * .02, .16 - k * .01, .034), mat, (0, 0, _rng.uniform(-.25, .25)))
g.done()
zc = down(14.75, 7.66, .2)
g = prop('Jeannie trophy cups and certificate', 14.75, 7.66, zc)
for x, s in [(-.36, 1.0), (-.12, 1.25), (.10, .9)]:
    g.box((x, 0, .02 * s), (.07 * s, .07 * s, .04 * s), D['wood'])
    g.cyl((x, 0, .065 * s), .012 * s, .05 * s, D['mustard'], 8)
    g.cyl((x, 0, .125 * s), .025 * s, .07 * s, D['mustard'], 14, top=.045 * s, caps=(True, False))
    for dx in (-1, 1):
        g.box((x + dx * .05 * s, 0, .13 * s), (.015, .01, .04 * s), D['mustard'])
lean_art(g, .34, .08, 0, .20, .15, 'heart', -.15)
g.done()
g = wall_prop('Jeannie READ letter garland', 13.80, 5.60, .75, (0, -1, 0))
for k in range(3):
    x0, x1 = -.62 + k * .413, -.62 + (k + 1) * .413
    s0, s1 = .05 * math.sin(math.pi * k / 3), .05 * math.sin(math.pi * (k + 1) / 3)
    g.box(((x0 + x1) / 2, -.02, -(s0 + s1) / 2), (.42, .005, .005), D['cream'], (0, (s1 - s0) / .413, 0))
for k, (letter, mat) in enumerate(zip('READ', [D['coral'], D['mustard'], D['teal'], D['corn']])):
    x = -.39 + k * .26
    s = .05 * math.sin(math.pi * (x + .62) / 1.24)
    g.vflat([(x - .11, -s), (x, -s - .26), (x + .11, -s)], -.024, mat)
    pts, faces = text_mesh(letter, .12)
    g.raw([(x + px, -.027, -s - .085 + py) for px, py, _pz in pts], faces, D['paper'])
g.done()
framed('Jeannie story castle picture', 12.60, 7.40, .40, (0, 1, 0), .60, .45, 'castle')
zb = down(15.90, 7.30, .2)
g = prop('Jeannie bed cushions', 15.90, 7.30, zb)
for x, mat in [(-.28, D['teal']), (.28, D['coral'])]:
    g.soft((x, 0, .17), (.34, .13, .32), mat, .05, (-.30, 0, 0))
g.done()
zf = down(15.90, 6.20, .2)
g = prop('Jeannie bed foot throw', 15.90, 6.20, zf)
g.soft((0, 0, .015), (1.14, .45, .03), D['corn'], .012)
for dx in (-.565, .565):
    g.soft((dx, 0, -.12), (.03, .45, .28), D['corn'], .012)
g.done()
g = prop('Jeannie bedside plant', 15.30, 5.45, down(15.30, 5.45, .2))
plant(g, 0, 0, 0, .07, .10, .26, 20)
g.done()


# ================================================================== BASEMENT AND GARAGE
_use('base')

g, _ = rug_on('Basement games checker rug', 4.75, 3.00, -2.9, 2.8, 2.2, D['cream'], D['corn'], .10,
              motifs=[(diamond(-1.05 + i * .35, -.75 + j * .375, .12), D['mustard'] if (i + j) % 2 else D['corn'])
                      for i in range(7) for j in range(5)], nx=8, ny=6)
g.done()
g = prop('Basement word library books and reading basket', 3.75, 4.80, 0)
tops = [down(3.75, 4.80, z, .4) for z in (-2.80, -2.35, -1.90, -1.45)]
basket(g, -.28, 0, tops[0], .30, .24, .14)
for k, mat in enumerate([D['coral'], D['teal'], D['mustard']]):
    g.box((-.28, -.03 + k * .03, tops[0] + .17), (.22, .025, .16), mat, (0, 0, .1))
book_row(g, 0.0, 0, tops[0], .44, .22, 'x', .20, .30)
for z in tops[1:]:
    start = _rng.uniform(-.46, -.30)
    book_row(g, start, 0, z, _rng.uniform(.55, .85), .22, 'x', .18, .30)
g.done()
zb = down(1.05, 3.45, -2.3)
g = prop('Basement bunk cushions', 1.05, 3.45, zb)
for x, mat in [(-.25, D['corn']), (.25, D['coral'])]:
    g.soft((x, 0, .17), (.36, .13, .32), mat, .05, (-.30, 0, 0))
g.done()
g = prop('Basement bunk teddy bear', 1.05, 2.85, down(1.05, 2.85, -2.3), 90)
teddy(g, 0, 0, 0, D['mustard'], s=.8)
g.done()
g = prop('Basement toys by the slide', 2.30, 2.90, down(2.30, 2.90, -2.8))
for x, y, mat, a in [(0, 0, D['coral'], .2), (.13, .05, D['teal'], .9), (.06, -.10, D['mustard'], .5)]:
    g.box((x, y, .05), (.10, .10, .10), mat, (0, 0, a))
g.box((.07, .02, .15), (.10, .10, .10), D['corn'], (0, 0, .4))
g.ball((.25, .20, .09), .09, D['rose'])
g.box((-.22, .30, .04), (.18, .09, .05), D['corn'])
g.box((-.24, .30, .085), (.09, .08, .04), D['paper'])
for x in (-.28, -.16):
    for y in (.255, .345):
        g.cyl((x, y, .02), .02, .015, D['ink'], 8, rot=(math.pi / 2, 0, 0))
g.done()
zd = down(3.55, 7.20, -1.9)
g = prop('Basement family bank piggy bank mug and notebook', 3.55, 7.20, zd)
g.ball((0, 0, .055), (.075, .05, .05), D['rose'], 10, 6)
g.cyl((-.08, 0, .055), .022, .02, D['rose'], 10, rot=(0, math.pi / 2, 0))
for dx in (-.04, .04):
    for dy in (-.025, .025):
        g.cyl((dx, dy, .012), .012, .025, D['rose'], 8)
    g.cyl((dx - .02, 0, .1), .014, .03, D['rose'], 6, top=.002)
g.box((.01, 0, .104), (.03, .005, .004), D['ink'])
g.cyl((-.70, -.05, .045), .038, .09, D['teal'], 12)
g.box((-.38, -.02, .006), (.22, .16, .012), D['coral'], (0, 0, .2))
g.done()
g = prop('Basement laundry basket of folded clothes', 5.09, 7.30, down(5.09, 7.30, -1.8))
basket(g, 0, 0, 0, .40, .30, .18)
for k, mat in enumerate([D['coral'], D['teal'], D['cream']]):
    g.soft((0, 0, .14 + k * .045), (.30, .22, .045), mat, .015, (0, 0, _rng.uniform(-.15, .15)))
g.done()
framed('Basement bunk rainbow painting', .80, 2.20, -1.20, (-1, 0, 0), .30, .24, 'rainbow', frame=False)
framed('Basement bunk pet painting', .80, 3.20, -1.20, (-1, 0, 0), .30, .24, 'pet', frame=False)

g = prop('Garage shelf bins and boxes', -.40, 3.05, 0)
t0, t1, t2, t3 = (down(-.40, 3.05, z, .45) for z in (.20, .70, 1.20, 1.70))
g.soft((0, -.45, t0 + .14), (.34, .30, .28), D['corn'], .04)
g.soft((0, .40, t0 + .14), (.34, .30, .28), D['teal'], .04)
for y in (-.60, -.02, .55):
    g.box((0, y, t1 + .13), (.34, .30, .26), D['kraft'], (0, 0, _rng.uniform(-.08, .08)))
for y in (-.45, .15):
    g.box((0, y, t2 + .12), (.34, .30, .24), D['kraft'])
g.cyl((0, .60, t2 + .06), .08, .12, D['corn'], 12)
g.ball((0, -.40, t3 + .11), .11, D['coral'])
g.box((0, .30, t3 + .10), (.30, .28, .20), D['kraft'])
g.done()
g = prop('Garage kid scooter and helmet', -.55, 4.60, down(-.55, 4.60, .3))
g.box((0, 0, .06), (.12, .55, .03), D['teal'])
for y in (-.24, .24):
    g.cyl((0, y, .05), .05, .03, D['ink'], 12, rot=(0, math.pi / 2, 0))
g.box((0, -.28, .43), (.03, .03, .74), D['ink'], (-.12, 0, 0))
g.box((0, -.325, .80), (.40, .03, .03), D['ink'])
g.ball((.30, .20, .07), (.11, .13, .09), D['coral'], 10, 6)
g.done()


def flower_bed(g, x0, x1, y0, y1, count, clumps, oz=0.0):
    """Flowers and leaf clumps scattered over a bed (local coordinates, z by ray cast)."""
    for k in range(count):
        x, y = _rng.uniform(x0, x1), _rng.uniform(y0, y1)
        flower(g, x, y, down(g.root.location.x + x, g.root.location.y + y, .5) - g.root.location.z + oz,
               _rng.uniform(.16, .30), FLOWERS[k % 4])
    for k in range(clumps):
        x, y = _rng.uniform(x0, x1), _rng.uniform(y0, y1)
        z = down(g.root.location.x + x, g.root.location.y + y, .5) - g.root.location.z
        g.leaves((x, y, z + .10), 16, .14, .08, zspread=.07)


# ================================================================== GARDEN
_use('garden')

# Stepping stones from the opened sunroom panel to the Garden & maths spot.
g = prop('Garden stepping stone path', 0, 0, 0)
for x, y in [(4.65, 11.72), (4.72, 12.22), (4.92, 12.70), (5.20, 13.14), (5.52, 13.55), (5.84, 13.95),
             (6.08, 14.36), (6.15, 14.80)]:
    loc, normal = ground(x, y)
    tilt = Vector((0, 0, 1)).rotation_difference(normal).to_euler()
    g.cyl(tuple(loc + normal * .01), .21 + _rng.uniform(-.02, .02), .04, D['stone'], 10, rot=tuple(tilt))
g.done()

# Flower beds along the sunroom sill, either side of the path.
for name, x0, x1 in [('Garden sunroom sill west flower bed', 1.0, 3.9), ('Garden sunroom sill east flower bed', 5.4, 7.3)]:
    zb = down((x0 + x1) / 2, 11.65, .5)
    g = prop(name, (x0 + x1) / 2, 11.65, zb)
    half = (x1 - x0) / 2
    g.box((0, 0, .008), (x1 - x0, .36, .016), D['soil'])
    k = 0
    x = -half + .08
    while x < half - .05:
        g.box((x, .215, .03), (.14, .08, .06), D['stone'], (0, 0, _rng.uniform(-.08, .08)))
        x += .165
    flower_bed(g, -half + .1, half - .1, -.14, .12, int((x1 - x0) * 5), 4, .016)
    g.done()

# Garden & maths: a raised vegetable bed (the station faces it), a watering can.
zg = ground(6.15, 15.75)[0].z
g = prop('Garden raised vegetable bed', 6.15, 15.75, zg, blocking=True, station='farm')
for y in (-.475, .475):
    g.box((0, y, .15), (1.80, .05, .30), D['cedar'])
for x in (-.875, .875):
    g.box((x, 0, .15), (.05, .90, .30), D['cedar'])
g.box((0, 0, .135), (1.70, .90, .25), D['soil'])
for x in (-.60, -.28, .04):
    g.leaves((x, -.20, .34), 22, .11, .09, zspread=.05, up=.2)
for x in (-.62, -.44, -.26, -.08):
    g.ball((x, .20, .265), .02, D['coral'], 6, 4)
    g.leaves((x, .20, .36), 5, .03, .06, zspread=.06, up=.1)
for x in (.45, .72):
    g.box((x, .02, .60), (.02, .02, .70), D['wood'])
    g.leaves((x, .02, .55), 12, .09, .06, zspread=.22)
    for k in range(3):
        g.ball((x + .05 * math.cos(k * 2.1), .02 + .05 * math.sin(k * 2.1), .45 + .1 * k), .03, D['coral'], 8, 5)
for k, x in enumerate((-.60, -.28, .04)):
    g.box((x, -.52, .30), (.012, .012, .18), D['wood'])
    g.box((x, -.525, .38), (.09, .006, .065), D['paper'])
    for d in range(k + 1):
        g.vflat(ngon(.009, 8, x - .025 * k + d * .025, .38), -.529, [D['coral'], D['teal'], D['mustard']][k])
g.done()
g = prop('Garden watering can', 7.35, 15.40, ground(7.35, 15.40)[0].z)
g.cyl((0, 0, .10), .085, .20, D['teal'], 14)
g.box((-.12, 0, .16), (.025, .025, .26), D['teal'], (0, -.8, 0))
g.cyl((-.21, 0, .25), .03, .03, D['teal'], 10, rot=(0, -.8, 0))
for x, z, a in [(-.04, .23, .6), (.04, .26, 0), (.10, .22, -.6)]:
    g.box((x, 0, z), (.07, .02, .02), D['teal'], (0, a, 0))
g.done()
g = prop('Garden ball by the trampoline', 11.30, 13.20, ground(11.30, 13.20)[0].z)
g.ball((0, 0, .11), .11, D['coral'], 12, 8)
g.done()
g = prop('Garden bucket and spade', 3.55, 18.00, ground(3.55, 18.00)[0].z)
g.cyl((0, 0, .07), .09, .14, D['corn'], 14, top=.11, caps=(True, False))
g.box((.20, .05, .012), (.05, .30, .02), D['wood'], (0, 0, .5))
g.box((.14, -.07, .012), (.09, .10, .015), D['mustard'], (0, 0, .5))
g.done()

# Front garden: plant the bare bed, edge the shrub bed, chalk hopscotch.
g = prop('Front garden planted flower bed', 7.80, -3.60, down(7.80, -3.60, .5))
flower_bed(g, -.62, .62, -.62, .62, 24, 6)
g.done()
g = prop('Front shrub bed flower edge', 5.28, -5.40, down(5.28, -5.40, .5))
for k, y in enumerate([-1.40, -.85, -.30, .25, .80, 1.35]):
    z = down(5.28, -5.40 + y, .5) - g.root.location.z
    for j in range(3):
        flower(g, _rng.uniform(-.06, .06), y + _rng.uniform(-.12, .12), z, _rng.uniform(.16, .26), FLOWERS[(k + j) % 3])
    g.leaves((0, y, z + .09), 8, .10, .06, zspread=.05)
g.done()
zd = down(-3.50, -7.10, .5)
g = prop('Driveway chalk hopscotch one to eight', -3.50, -7.10, zd + .0015)
chalk = [D['mustard'], D['rose'], D['corn']]
for n, (cx, cy) in enumerate([(0, -1.0), (0, -.58), (0, -.16), (-.20, .26), (.20, .26), (0, .68), (-.20, 1.10), (.20, 1.10)], 1):
    h = .20
    for x0, y0, x1, y1 in [(cx - h, cy - h, cx + h, cy - h + .03), (cx - h, cy + h - .03, cx + h, cy + h),
                           (cx - h, cy - h, cx - h + .03, cy + h), (cx + h - .03, cy - h, cx + h, cy + h)]:
        g.flat([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 0, D['paper'])
    pts, faces = text_mesh(str(n), .22)
    g.raw([(cx + px, cy + py, .0012) for px, py, _pz in pts], faces, chalk[n % 3])
g.done()

# ================================================================== WALLS AT EYE LEVEL (round 2)
# Blank paint filled a third of many frames: every room seen from its arrival
# view gets 2-4 wall pieces chosen for the family member who uses it. All are
# wall-mounted and walk-past (no collision), at most a shelf's depth proud.


def _radial(cx, cz, a, l0, l1, w):
    d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    return [(cx + d[0] * l0 - n[0] * w, cz + d[1] * l0 - n[1] * w), (cx + d[0] * l1 - n[0] * w, cz + d[1] * l1 - n[1] * w),
            (cx + d[0] * l1 + n[0] * w, cz + d[1] * l1 + n[1] * w), (cx + d[0] * l0 + n[0] * w, cz + d[1] * l0 + n[1] * w)]


def clock(name, x, y, z, direction, r=.14, rim=None, dots=False):
    """A wall clock at ten past ten: rim, face, twelve ticks, two hands."""
    g = wall_prop(name, x, y, z, direction)
    g.cyl((0, -.012, 0), r + .018, .024, rim or D['wood'], 20, rot=(math.pi / 2, 0, 0))
    g.vflat(ngon(r, 20), -.0255, D['paper'])
    for k in range(12):
        a = math.pi / 2 - k * math.tau / 12
        if dots:
            g.vflat(ngon(r * .075, 8, .80 * r * math.cos(a), .80 * r * math.sin(a)), -.027,
                    [D['coral'], D['mustard'], D['teal'], D['corn']][k % 4])
        else:
            g.vflat(_radial(0, 0, a, r * (.70 if k % 3 == 0 else .78), r * .88, r * .025), -.027, D['ink'])
    g.vflat(_radial(0, 0, math.pi / 2 + 2 * math.pi / 6 - math.pi / 36, -.08 * r, .50 * r, r * .045), -.0285, D['ink'])
    g.vflat(_radial(0, 0, math.pi / 2 - 2 * math.pi / 6, -.08 * r, .76 * r, r * .03), -.0292, D['ink'])
    g.vflat(ngon(r * .07, 10), -.0300, D['coral'])
    return g.done()


def bunting(g, width, mats, drop=.14, sag=.05, letters=None):
    """A string of pennants across local x (the wall prop's frame)."""
    for k in range(3):
        x0, x1 = -width / 2 + k * width / 3, -width / 2 + (k + 1) * width / 3
        s0, s1 = sag * math.sin(math.pi * k / 3), sag * math.sin(math.pi * (k + 1) / 3)
        g.box(((x0 + x1) / 2, -.02, -(s0 + s1) / 2), (width / 3 + .01, .005, .005), D['cream'], (0, (s1 - s0) / (width / 3), 0))
    n = len(mats)
    for k, mat in enumerate(mats):
        x = -width / 2 + (k + .5) * width / n
        s = sag * math.sin(math.pi * (x + width / 2) / width)
        half = min(.075, width / n * .42)
        g.vflat([(x - half, -s), (x, -s - drop), (x + half, -s)], -.024, mat)
        if letters:
            pts, faces = text_mesh(letters[k], drop * .42)
            g.raw([(x + px, -.027, -s - drop * .36 + py) for px, py, _pz in pts], faces, D['paper'])


def wall_shelf(name, x, y, z, direction, width=.60, depth=.14):
    g = wall_prop(name, x, y, z, direction)
    g.box((0, -depth / 2, 0), (width, depth, .025), D['wood'])
    for dx in (-width * .35, width * .35):
        g.box((dx, -.03, -.06), (.02, .06, .10), D['ink'])
    return g


def paint_walls(prefixes, mat, rect, generic):
    """Room-side faces of the named wall pieces take the room's own paint.

    Only tall vertical faces that face into ``rect`` and still carry one of the
    ``generic`` finishes change: skirting, the far side of a shared partition
    and exterior cladding keep theirs, so neighbouring rooms are untouched."""
    x0, x1, y0, y1 = rect
    changed = 0
    for obj in scene.objects:
        if obj.type != 'MESH' or not obj.name.startswith(prefixes):
            continue
        mesh, mw = obj.data, obj.matrix_world
        nm = mw.to_3x3().inverted().transposed()
        slots = [m.name if m else '' for m in mesh.materials]
        if not any(s in generic for s in slots):
            continue
        if mat.name not in slots:
            mesh.materials.append(mat)
            slots.append(mat.name)
        for p in mesh.polygons:
            if slots[p.material_index] not in generic:
                continue
            n = (nm @ p.normal).normalized()
            zs = [(mw @ mesh.vertices[v].co).z for v in p.vertices]
            if abs(n.z) > .3 or max(zs) - min(zs) < .25:
                continue
            c = mw @ p.center
            ix, iy = c.x + n.x * .25, c.y + n.y * .25
            if x0 <= ix <= x1 and y0 <= iy <= y1 and x0 - .2 <= c.x <= x1 + .2 and y0 - .2 <= c.y <= y1 + .2:
                p.material_index = slots.index(mat.name)
                changed += 1
    return changed


bpy.context.view_layer.update()
WALL_PAINT = {
    # A1: the family bathroom reads green (sage-mint above the sea-green tile).
    'green bath': paint_walls(('Bath left wall', 'Bath back wall', 'Bath entry return', 'Primary left wall'),
                              material('Green bathroom sage plaster', _lin('#cfe3d2'), .85),
                              (9.84, 12.24, 4.56, 7.14), {'Warm white enamel', 'Upstairs warm grey plaster'}),
    # H126 documents Cory's side of the shared partition as warm white, not grey.
    'cory': paint_walls(('End bedroom far wall', 'End bedroom south wall', 'End bedroom north wall', 'Nursery blue right wall',
                         'Closet recessed back', 'Closet south return', 'Closet north return', 'Nursery wardrobe',
                         'Hall end bedroom wall', 'Primary right window wall'),
                        material('Cory warm white plaster', _lin('#efe6d6'), .85),
                        (15.49, 18.84, .36, 6.46), {'Upstairs warm grey plaster'}),
    # Jeannie's walls are undocumented generic plaster: a gentle sea-glass
    # signature to go with her teal reading corner.
    'jeannie': paint_walls(('Lower bedroom back window wall', 'Lower bedroom side window wall',
                            'Lower bedroom front wall', 'Lower bedroom right wall'),
                           material('Jeannie sea glass plaster', _lin('#d5e6e0'), .85),
                           (12.15, 16.55, 5.0, 8.0), {'Upstairs warm grey plaster'}),
}
# Repainted meshes must be re-evaluated before any further placement ray casts.
bpy.context.view_layer.update()
print('WALL PAINT:', WALL_PAINT, flush=True)
for room, faces in WALL_PAINT.items():
    if faces < 3:
        raise RuntimeError('dressing: %s walls were not repainted (%d faces)' % (room, faces))

_use('main')
g = wall_prop('Living family height chart', 3.34, 3.90, .80, (0, 1, 0))
g.box((0, -.008, 0), (.11, .016, 1.52), D['cream'])
for k in range(16):
    z = .05 + k * .1 - .80
    g.vflat([(-.055, z - .003), (-.055 + (.07 if k % 5 == 0 else .035), z - .003),
             (-.055 + (.07 if k % 5 == 0 else .035), z + .003), (-.055, z + .003)], -.0165, D['ink'])
for h, mat in [(.80, D['corn']), (1.02, D['rose']), (1.17, D['mustard']), (1.27, D['teal'])]:
    z = h - .80
    g.vflat([(0, z - .018), (.075, z - .018), (.095, z), (.075, z + .018), (0, z + .018)], -.018, mat)
g.done()
clock('Living clock above the television', 2.25, 3.60, 2.15, (0, 1, 0), .16)
g = wall_prop('Living front window curtains', 2.175, .80, 1.50, (0, -1, 0))
for x in (-1.595, 1.595):
    g.soft((x, -.14, -.025), (.24, .05, 1.65), D['cream'], .02)
    g.soft((x, -.14, -.70), (.245, .056, .10), D['coral'], .01)
g.box((0, -.14, .82), (3.62, .02, .02), D['ink'])
for x in (-1.75, 1.75):
    g.box((x, -.07, .82), (.02, .14, .02), D['ink'])
    g.ball((x * 1.04, -.14, .82), .025, D['ink'], 8, 5)
g.done()
g = wall_prop('Entry round mirror', 7.30, -.90, 2.00, (1, 0, 0))
g.cyl((0, -.012, 0), .22, .024, D['wood'], 24, rot=(math.pi / 2, 0, 0))
g.vflat(ngon(.19, 24), -.0255, mirror)
g.done()
g = wall_prop('Kitchen family wall calendar', 3.08, 7.50, 1.55, (0, 1, 0))
g.box((0, -.003, 0), (.30, .006, .44), D['paper'])
g.vflat([(-.14, .02), (.14, .02), (.14, .20), (-.14, .20)], -.0065, D['corn'])
g.vflat(ngon(.10, 14, -.02, -.02 + .10, sy=.45), -.0075, D['teal'])
g.vflat(ngon(.03, 10, .08, .15), -.0075, D['mustard'])
for i in range(6):
    g.vflat([(-.13 + i * .052, -.19), (-.127 + i * .052, -.19), (-.127 + i * .052, -.01), (-.13 + i * .052, -.01)], -.0065, D['ink'])
for j in range(5):
    g.vflat([(-.13, -.19 + j * .045), (.13, -.19 + j * .045), (.13, -.187 + j * .045), (-.13, -.187 + j * .045)], -.0065, D['ink'])
for u, v in [(-.05, -.12), (.07, -.06)]:
    g.vflat(ngon(.016, 10, u, v), -.0072, D['coral'])
g.box((0, -.01, .225), (.08, .012, .015), D['ink'])
g.done()
clock('Kitchen clock above the window', 1.70, 7.50, 2.43, (0, 1, 0), .11, D['teal'])
g = wall_prop('Kitchen window valance', 1.70, 7.50, 2.36, (0, 1, 0))
g.soft((0, -.03, -.12), (1.98, .045, .16), D['cream'], .015)
g.soft((0, -.03, -.19), (1.98, .05, .025), D['teal'], .008)
g.done()
clock('Dining room clock', 7.52, 7.40, 1.95, (0, 1, 0), .13)
framed('Dining wall landscape', 7.20, 6.20, 1.85, (1, 0, 0), .60, .42, 'landscape')
framed('Dining wall flower drawing', 7.20, 5.55, 1.72, (1, 0, 0), .26, .32, 'flower')
framed('Dining wall heart drawing', 7.20, 6.85, 1.72, (1, 0, 0), .26, .32, 'heart')

_use('upper')
framed('Upstairs hall landing landscape', 11.55, 3.95, 2.65, (0, -1, 0), .36, .28, 'landscape')
framed('Upstairs hall landing pet drawing', 11.55, 3.95, 2.22, (0, -1, 0), .24, .30, 'pet')
framed('Upstairs hall heart drawing', 14.35, 4.10, 2.70, (0, 1, 0), .26, .32, 'heart')
framed('Upstairs hall house drawing', 14.85, 4.10, 2.50, (0, 1, 0), .32, .26, 'sun_house')
g = wall_prop('Upstairs hall bunting over Cory door', 15.00, 4.01, 3.48, (1, 0, 0))
bunting(g, .74, [D['coral'], D['mustard'], D['teal'], D['corn'], D['rose']], drop=.10, sag=.03)
g.done()
framed('Green bathroom duck picture', 10.20, 6.60, 2.40, (0, 1, 0), .30, .26, 'duck')
g = wall_shelf('Green bathroom shelf with bottles and plant', 10.30, 6.50, 2.85, (-1, 0, 0), .44, .13)
for x, mat in [(-.14, D['teal']), (-.07, D['coral'])]:
    g.cyl((x, -.065, .07), .025, .12, mat, 10)
g.cyl((.02, -.065, .045), .03, .065, D['cream'], 10, rot=(0, math.pi / 2, 0))
plant(g, .14, -.065, .0125, .045, .07, .14, 10)
g.done()
framed('Kieran nursery pet picture', 14.90, 3.15, 2.50, (1, 0, 0), .26, .32, 'pet')
framed('Kieran nursery heart picture', 11.60, 3.10, 2.45, (-1, 0, 0), .24, .24, 'heart')
g = wall_shelf('Kieran nursery shelf of soft toys', 14.35, 2.90, 2.55, (0, 1, 0), .60, .14)
for x, mat in [(-.2, D['rose']), (0, D['corn']), (.2, D['mustard'])]:
    small_toy(g, x, -.07, .0125, .045, mat)
g.done()
clock('Cory learning clock', 18.30, 4.06, 3.20, (1, 0, 0), .16, D['teal'], dots=True)
g = wall_prop('Cory number bunting over the desk', 16.36, 5.95, 3.25, (0, 1, 0))
bunting(g, 1.20, [D['coral'], D['mustard'], D['teal'], D['corn'], D['rose']], drop=.16, sag=.05, letters='12345')
g.done()
g = wall_shelf('Cory shelf of block models', 17.60, 5.95, 2.60, (0, 1, 0), .56, .14)
for k, mat in enumerate([D['wood'], D['teal'], D['mustard']]):
    for j in range(k + 1):
        g.box((-.18 + k * .18, -.07, .0425 + j * .06), (.06, .06, .06), mat if j == k else D['cream'], (0, 0, .3 * j))
g.done()
framed('Cory pixel rocket poster', 16.30, 1.00, 2.55, (0, -1, 0), .44, .44, 'pixel', frame=False)
framed('Upstairs hall flower drawing by the bedroom door', 12.78, 4.10, 2.25, (0, 1, 0), .26, .30, 'flower')
framed('Parents bedroom north landscape', 12.80, 8.00, 2.60, (0, 1, 0), .40, .30, 'landscape')
clock('Parents bedroom clock', 15.33, 8.00, 2.85, (0, 1, 0), .11)

_use('lower')
g = wall_shelf('Jeannie shelf of books above the bed', 16.00, 7.40, .30, (0, 1, 0), .70, .16)
book_row(g, -.32, -.08, .0125, .46, .13, 'x', .10, .16)
g.ball((.25, -.08, .10), .055, D['corn'], 10, 6)
g.cyl((.25, -.08, .03), .03, .035, D['wood'], 10)
g.done()
framed('Jeannie moon picture above the bed', 16.00, 7.40, .72, (0, 1, 0), .34, .26, 'moon')
framed('Jeannie flower picture', 15.30, 5.60, .35, (0, -1, 0), .26, .26, 'flower')
framed('Jeannie rainbow picture by the door', 12.85, 5.60, .20, (0, -1, 0), .40, .30, 'rainbow')
framed('Ellie flower picture by the door', 10.40, 5.95, .35, (0, -1, 0), .26, .32, 'flower')
# The far wall's window now sits at the rear corner (House Tour 188.527s), so
# the bunting and the picture hang over the head of the bed instead, where the
# video has a framed picture; the mirror follows the cabinet to the entry wall.
g = wall_prop('Ellie princess bunting', 8.60, 7.00, .85, (-1, 0, 0))
bunting(g, .90, [D['rose'], D['mustard'], D['flilac'], D['paper'], D['rose'], D['mustard']], drop=.13, sag=.04)
g.done()
framed('Ellie princess dress drawing', 8.60, 7.05, .35, (-1, 0, 0), .30, .36, 'dress')
g = wall_prop('Ellie round mirror above the dresser', 10.40, 8.10, .55, (1, 0, 0))
g.cyl((0, -.012, 0), .20, .024, D['rose'], 24, rot=(math.pi / 2, 0, 0))
g.vflat(ngon(.17, 24), -.0255, mirror)
g.done()
framed('Family room landscape above the plant', 13.90, 3.85, .52, (1, 0, 0), .50, .36, 'landscape')
clock('Family room clock', 13.90, 3.85, .96, (1, 0, 0), .10)

_use('base')
g = wall_prop('Basement bunting over the bunk', .90, 2.70, -.95, (-1, 0, 0))
bunting(g, 1.60, [D['coral'], D['mustard'], D['teal'], D['corn'], D['rose'], D['mustard'], D['teal']], drop=.14, sag=.06)
g.done()
g = wall_prop('Office cork board', 2.65, 7.40, -1.62, (0, 1, 0))
g.box((0, -.006, 0), (.50, .012, .36), D['kraft'])
for k, (u, v, mat) in enumerate([(-.15, .07, D['paper']), (.02, .09, D['mustard']), (.17, .05, D['corn']), (-.06, -.09, D['rose'])]):
    g.box((u, -.014, v), (.13, .004, .10), mat, (0, _rng.uniform(-.1, .1), 0))
    g.box((u, -.02, v + .04), (.012, .006, .012), D['coral'])
g.done()
clock('Office clock', 4.20, 7.40, -1.10, (0, 1, 0), .12)


print('DRESSING:', len(_made), 'dressing meshes;',
      sum(len(bpy.data.objects[n].data.polygons) for n in _made), 'faces', flush=True)

