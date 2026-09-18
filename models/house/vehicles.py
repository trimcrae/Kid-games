"""The two cars in the garage: a black minivan and a burgundy crossover.

Each body is lofted from three side-view profiles — the top line (bonnet,
windscreen, roof, tailgate), the belt line (where the glass starts) and the
plan (how the body narrows at the ends) — sampled smoothly along the length
and swept through a rounded cross-section. The wheel arches are cut with a
boolean, the glass is the same loft surface split into its own meshes so the
browser can make it see-through, and a dark cabin with two rows of seats
sits behind it so the car does not look hollow. Everything stays code-drawn,
no badges, no plates.

Executed from basement_garage.py with build.py's helpers (box, cylinder,
material, finish, asset …) in scope. Blender axes: x across the car, +y is
the nose, z up; the vehicle's origin is on the ground under its centre.
"""

tyre = material('Vehicle tyre rubber', (.013, .013, .013), .82)
archliner = material('Vehicle wheel arch liner', (.018, .018, .02), .92)
alloy = material('Vehicle alloy wheel', (.50, .52, .54), .32, .85)
trimblack = material('Vehicle black trim', (.02, .022, .024), .62)
taillamp = material('Vehicle red tail lamp', (.42, .018, .028), .14)
lens = material('Vehicle headlamp lens', (.80, .84, .87), .10, .30)
cabin = material('Vehicle dark cabin', (.045, .045, .05), .92)
seatcloth = material('Vehicle grey seat cloth', (.16, .165, .17), .95, texture='fabric')


def _spline(keys, t):
    """Catmull-Rom through (t, value) keys, clamped at the ends."""
    if t <= keys[0][0]:
        return keys[0][1]
    if t >= keys[-1][0]:
        return keys[-1][1]
    for i in range(len(keys) - 1):
        t0, v0 = keys[i]
        t1, v1 = keys[i + 1]
        if t0 <= t <= t1:
            break
    tp, vp = keys[max(0, i - 1)]
    tn, vn = keys[min(len(keys) - 1, i + 2)]
    u = (t - t0) / (t1 - t0)
    # Tangents scaled to the uneven key spacing (a centripetal-ish estimate).
    m0 = (v1 - vp) / (t1 - tp) * (t1 - t0)
    m1 = (vn - v0) / (tn - t0) * (t1 - t0)
    u2, u3 = u * u, u * u * u
    return ((2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0
            + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1)


def _in(ranges, y):
    return any(a <= y <= b for a, b in ranges)


def _section(w, wt, z0, zb, zt):
    """Half a cross-section, bottom centre to roof centre, as (x, z)."""
    band = max(zt - zb, .07)
    zb = zt - band
    return [(0, z0), (w * .80, z0), (w - .02, z0 + .06), (w, z0 + .18),
            (w + .012, (z0 + zb) / 2 + .05), (w + .008, zb - .10), (w - .012, zb),
            (wt + .02, zb + band * .45), (wt, zt - .02), (wt - .06, zt), (0, zt + .012)]


def _mesh(name, verts, faces, mat, smooth=True, sharp=()):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = finish(bpy.data.objects.new(name, mesh), name, mat)
    for p in mesh.polygons:
        p.use_smooth = smooth
    if sharp:
        keys = set(sharp)
        for e in mesh.edges:
            if (e.vertices[0], e.vertices[1]) in keys or (e.vertices[1], e.vertices[0]) in keys:
                e.use_edge_sharp = True
    return obj


def _rings(spec, lo=None, hi=None, inset=None):
    """Stations along the length with a cross-section at each, as (ys, rings,
    has_glass). `inset` shrinks each section into the cabin lining."""
    half = spec['length'] / 2
    n = spec.get('stations', 46)
    ys, rings, has_glass = [], [], []
    for i in range(n):
        y = -half + (i / (n - 1)) * spec['length']
        if lo is not None and not (lo <= y <= hi):
            continue
        zt = _spline(spec['top'], y)
        zb = min(_spline(spec['belt'], y), zt)
        w = _spline(spec['plan'], y)
        glass = zt - zb > .14
        wt = w - (spec['tumblehome'] if glass else .09)
        z0 = spec['clearance'] + _spline(spec.get('underside', [(0, 0)]), y)
        h = _section(w, wt, z0, zb, zt)
        if inset:
            h = [(x * inset[0], z * inset[1] + inset[2]) for x, z in h]
        ys.append(y)
        rings.append(h + [(-x, z) for x, z in reversed(h[1:-1])])
        has_glass.append(glass)
    return ys, rings, has_glass


def _loft(spec):
    """The body and glass lofts. Returns (body, glass meshes)."""
    ys, rings, has_glass = _rings(spec)
    n, m = len(rings), len(rings[0])
    verts = [(x, y, z) for y, ring in zip(ys, rings) for x, z in ring]
    idx = lambda i, k: i * m + (k % m)
    # Which faces are glass: the side band (segments 6-7, 7-8 and their
    # mirrors) between the pillars, the top (segments 8 and up) over the
    # windscreen and the rear screen.
    body_faces, side_faces, screen_faces = [], [], []
    sharp = []
    for i in range(n - 1):
        y = (ys[i] + ys[i + 1]) / 2
        glass = has_glass[i] and has_glass[i + 1]
        for k in range(m):
            f = (idx(i, k), idx(i + 1, k), idx(i + 1, k + 1), idx(i, k + 1))
            seg = k if k < 10 else (m - 1 - k)  # mirrored segment number
            if glass and seg in (6, 7) and _in(spec['windows'], y):
                side_faces.append(f)
            elif glass and seg >= 8 and (_in([spec['windscreen']], y) or _in([spec['rear_glass']], y)):
                screen_faces.append(f)
            else:
                body_faces.append(f)
        for k in (0, 1, 6, m - 6, m - 1):
            sharp.append((idx(i, k), idx(i + 1, k)))
    # End caps.
    body_faces.append(tuple(reversed([idx(0, k) for k in range(m)])))
    body_faces.append(tuple(idx(n - 1, k) for k in range(m)))
    body = _mesh('Vehicle body shell', verts, body_faces, spec['paint'], sharp=sharp)
    glasses = []
    for name, faces in (('Vehicle side glass', side_faces), ('Vehicle windscreen glass', screen_faces)):
        if faces:
            glasses.append(_mesh(name, verts, faces, screen))
    return body, glasses


def _cut_arches(body, spec):
    """Wheel wells: a boolean pocket each side, lined in black plastic."""
    r = spec['wheel_radius'] + .07
    w = _spline(spec['plan'], 0)
    cutters = []
    for y in spec['axles']:
        for side in (-1, 1):
            c = cylinder('Vehicle arch cutter', (side * (w - .16), y, spec['wheel_radius']), r, .42, archliner, 40)
            c.rotation_euler.y = math.pi / 2
            cutters.append(c)
    for c in cutters:
        mod = body.modifiers.new('Wheel arch', 'BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.solver = 'EXACT'
        mod.material_mode = 'TRANSFER'
        mod.object = c
    depsgraph = bpy.context.evaluated_depsgraph_get()
    cut = bpy.data.meshes.new_from_object(body.evaluated_get(depsgraph))
    old = body.data
    body.modifiers.clear()
    body.data = cut
    cut.materials.clear()
    cut.materials.append(spec['paint'])
    cut.materials.append(archliner)
    # The faces the cut made are the ones lying on a cutter's surface: they
    # become the flat black liner, and the edge where they meet the paint is
    # sharp so the cut does not smear the shell's smooth normals.
    def lined(p):
        cx, cy, cz = p.center
        return any(abs(cx) > w - .38 and abs(math.hypot(cy - y, cz - spec['wheel_radius']) - r) < .01
                   for y in spec['axles']) or any(abs(abs(cx) - (w - .37)) < .01 and math.hypot(cy - y, cz - spec['wheel_radius']) < r + .01
                                                    for y in spec['axles'])
    for p in cut.polygons:
        p.material_index = 1 if lined(p) else 0
        p.use_smooth = p.material_index == 0
    owners = {}
    for p in cut.polygons:
        for a, b in p.edge_keys:
            owners.setdefault((min(a, b), max(a, b)), set()).add(p.material_index)
    for e in cut.edges:
        a, b = e.vertices
        if len(owners.get((min(a, b), max(a, b)), ())) > 1:
            e.use_edge_sharp = True
    bpy.data.meshes.remove(old)
    for c in cutters:
        mesh = c.data
        bpy.data.objects.remove(c)
        bpy.data.meshes.remove(mesh)
    # (No weighted-normal modifier here: it blends the liner into the shell
    # and spikes the shading round the arch; sharp edges alone shade cleanly.)


def _ring(name, loc, outer, inner, depth, mat, n=36):
    """A tube (annulus extruded along x), for a tyre with a rim inside."""
    ring = [(math.cos(i * math.tau / n), math.sin(i * math.tau / n)) for i in range(n)]
    verts = []
    for xo in (-depth / 2, depth / 2):
        for rad in (outer, inner):
            verts += [(xo, c * rad, s * rad) for c, s in ring]
    o0, i0, o1, i1 = 0, n, 2 * n, 3 * n
    faces = []
    for k in range(n):
        j = (k + 1) % n
        faces.append((o0 + k, o0 + j, o1 + j, o1 + k))   # tread
        faces.append((i0 + j, i0 + k, i1 + k, i1 + j))   # inside the tube
        faces.append((o0 + j, o0 + k, i0 + k, i0 + j))   # inner sidewall
        faces.append((o1 + k, o1 + j, i1 + j, i1 + k))   # outer sidewall
    obj = _mesh(name, verts, faces, mat)
    obj.location = loc
    return obj


def _wheel(spec, x, y):
    r, side = spec['wheel_radius'], 1 if x > 0 else -1
    t = _ring('Vehicle rubber tyre', (x, y, r), r, r * .60, .24, tyre)
    mod = t.modifiers.new('Tyre shoulder', 'BEVEL')
    mod.width = .04
    mod.segments = 3
    mod.limit_method = 'ANGLE'
    rim = cylinder('Vehicle alloy rim', (x + side * .045, y, r), r * .62, .11, alloy, 28)
    rim.rotation_euler.y = math.pi / 2
    dish = cylinder('Vehicle wheel dish', (x + side * .02, y, r), r * .50, .12, trimblack, 28)
    dish.rotation_euler.y = math.pi / 2
    for i in range(5):
        a = i * math.tau / 5
        s = box('Vehicle wheel spoke', (x + side * .095, y + math.sin(a) * r * .30, r + math.cos(a) * r * .30),
                (.025, .07, r * .52), alloy, .006)
        s.rotation_euler.x = -a
    box('Vehicle hub cap', (x + side * .10, y, r), (.02, .09, .09), alloy, .008)


def _cabin(spec):
    """A dark interior and two rows of seats, seen through the glass: the
    body loft shrunk inwards, closed at both ends."""
    ys, rings, _ = _rings(spec, spec['rear_glass'][1] - .04, spec['windscreen'][1] + .04, (.90, .955, .03))
    n, m = len(rings), len(rings[0])
    verts = [(x, y, z) for y, ring in zip(ys, rings) for x, z in ring]
    idx = lambda i, k: i * m + (k % m)
    faces = [(idx(i, k), idx(i + 1, k), idx(i + 1, k + 1), idx(i, k + 1)) for i in range(n - 1) for k in range(m)]
    faces.append(tuple(reversed([idx(0, k) for k in range(m)])))
    faces.append(tuple(idx(n - 1, k) for k in range(m)))
    _mesh('Vehicle cabin lining', verts, faces, cabin)
    w = _spline(spec['plan'], 0) - spec['tumblehome'] - .05
    zb = _spline(spec['belt'], 0)
    for y in spec['seats']:
        for x in (-w * .55, w * .55):
            box('Vehicle seat cushion', (x, y, zb - .18), (.50, .52, .16), seatcloth, .04)
            box('Vehicle seat back', (x, y - .22, zb + .12), (.50, .12, .60), seatcloth, .04)
            box('Vehicle head rest', (x, y - .22, zb + .47), (.26, .10, .16), seatcloth, .03)
    # Dashboard and steering wheel, just visible through the windscreen.
    hi = spec['windscreen'][1] - .10
    box('Vehicle dashboard', (0, hi - .08, zb - .06), (w * 2 - .05, .26, .18), cabin, .03)
    sw = cylinder('Vehicle steering wheel', (-w * .55, hi - .30, zb + .02), .18, .025, trimblack, 24)
    sw.rotation_euler.x = math.radians(65)


def vehicle(name, pos, spec, photos='W1,W2'):
    root = asset(name, pos, 0, photos, 'simplified parked ' + spec['kind'] + '; no badges or license details')
    _build(spec)
    # Only the shell, the glass, the tyres and the bumpers stop a pet; the
    # rest is trim inside or on that shell.
    for o in root.children:
        if not any(o.name.startswith(k) for k in ('Vehicle body shell', 'Vehicle side glass', 'Vehicle windscreen glass', 'Vehicle rubber tyre', 'Vehicle lower bumper', 'Vehicle rear bumper')):
            o['browser_collide'] = False


def _build(spec):
    body, glasses = _loft(spec)
    _cut_arches(body, spec)
    half = spec['length'] / 2
    w = _spline(spec['plan'], 0)
    for y in spec['axles']:
        for side in (-1, 1):
            _wheel(spec, side * (w - .17), y)
    _cabin(spec)
    # Front: grille, headlamps wrapping the corners, black lower bumper.
    zf = _spline(spec['top'], half)
    wf = _spline(spec['plan'], half)
    box('Vehicle grille', (0, half + .01, zf - .36), (wf * 1.1, .05, .26), trimblack, .02)
    box('Vehicle lower bumper', (0, half - .02, spec['clearance'] + .10), (wf * 2 + .02, .16, .20), trimblack, .03)
    for side in (-1, 1):
        lamp = box('Vehicle headlamp', (side * (wf * .78), half - .04, zf - .13), (.42, .05, .13), lens, .02)
        lamp.rotation_euler.z = side * math.radians(-28)
        mirror = box('Vehicle side mirror', (side * (w + .11), spec['windscreen'][1] - .15, _spline(spec['belt'], 0) + .12), (.20, .13, .11), spec['paint'], .03)
        mirror.rotation_euler.z = side * math.radians(8)
        for y in spec['handles']:
            box('Vehicle door handle', (side * (w + .016), y, _spline(spec['belt'], y) - .20), (.015, .16, .03), spec['paint'], .005)
    # Rear: tail lamps on the corners, black lower bumper, a lip on the tailgate.
    zr = _spline(spec['top'], -half)
    wr = _spline(spec['plan'], -half)
    for side in (-1, 1):
        lamp = box('Vehicle tail lamp', (side * (wr * .80), -half + .04, zr - .18), (.34, .05, .26), taillamp, .02)
        lamp.rotation_euler.z = side * math.radians(24)
    box('Vehicle rear bumper', (0, -half + .03, spec['clearance'] + .10), (wr * 2 + .02, .16, .20), trimblack, .03)
    ysp = -half + .16
    box('Vehicle tailgate spoiler', (0, ysp, _spline(spec['top'], ysp) + .015), (wr * 1.6, .22, .035), spec['paint'], .01)
    if spec.get('roof_rails'):
        zt = _spline(spec['top'], 0)
        for side in (-1, 1):
            x = side * (w - spec['tumblehome'] - .12)
            rod('Vehicle roof rail', (x, spec['roof_rails'][0], zt + .04), (x, spec['roof_rails'][1], zt + .04), .02, trimblack)
            for y in spec['roof_rails']:
                box('Vehicle roof rail foot', (x, y, zt + .02), (.05, .10, .04), trimblack, .008)
    for side in (-1, 1):
        box('Vehicle rocker trim', (side * (w - .01), sum(spec['axles']) / 2, spec['clearance'] + .05),
            (.03, spec['axles'][1] - spec['axles'][0] - .90, .07), trimblack, .008)


MINIVAN = dict(
    kind='minivan', length=5.0, clearance=.17, wheel_radius=.35, axles=(-1.45, 1.55), tumblehome=.15,
    top=[(-2.5, 1.02), (-2.45, 1.40), (-2.34, 1.68), (-2.1, 1.75), (-1.0, 1.77), (0.3, 1.76), (0.75, 1.66),
         (1.1, 1.40), (1.5, 1.08), (1.75, 1.00), (2.3, .92), (2.5, .84)],
    belt=[(-2.5, 1.02), (-1.0, 1.03), (0.5, 1.05), (1.45, 1.08), (1.6, 1.10)],
    plan=[(-2.5, .86), (-2.3, .95), (-1.8, .98), (1.0, .98), (1.8, .96), (2.35, .90), (2.5, .82)],
    underside=[(-2.5, .10), (-2.2, 0), (2.1, 0), (2.5, .09)],
    windows=[(-2.28, -1.62), (-1.52, -.02), (.08, 1.12)], windscreen=(.78, 1.5), rear_glass=(-2.5, -2.36),
    seats=(-1.55, -.55, .55), handles=(-.85, .45),
)
CROSSOVER = dict(
    kind='crossover SUV', length=4.6, clearance=.21, wheel_radius=.36, axles=(-1.35, 1.35), tumblehome=.16,
    top=[(-2.3, 1.06), (-2.24, 1.38), (-2.1, 1.56), (-1.6, 1.64), (-.5, 1.67), (.3, 1.65), (.7, 1.52),
         (1.1, 1.22), (1.35, 1.06), (1.6, 1.02), (2.15, .95), (2.3, .86)],
    belt=[(-2.3, 1.06), (-1.0, 1.03), (.8, 1.05), (1.25, 1.08), (1.4, 1.10)],
    plan=[(-2.3, .82), (-2.1, .90), (-1.5, .925), (1.0, .925), (1.7, .91), (2.15, .86), (2.3, .78)],
    underside=[(-2.3, .11), (-2.0, 0), (1.9, 0), (2.3, .10)],
    windows=[(-2.02, -1.40), (-1.30, -.14), (-.04, .98)], windscreen=(.62, 1.30), rear_glass=(-2.3, -2.14),
    seats=(-.75, .45), handles=(-.65, .55), roof_rails=(-1.55, .35),
)
