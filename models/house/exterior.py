"""Exterior envelope: shell infill, roofs, cladding on outward wall faces.

Executed in build.py's Blender namespace after every room and the yard.
The homeowner's exterior photographs (front from the street, rear from the
lawn) show a split-level: a single-storey garage wing and entry block under
one long brown-shingle roof line, a two-storey wing with its ridge running
front to back whose rear gable is clad in dark weathered cedar shakes over
pale lap siding, and a glazed sunroom with a low shingle roof. Street names,
house numbers and neighbouring homes are not reproduced. Roof pitches,
overhangs and the split between siding and shakes are estimates read from the
photographs, not measurements.

The interior rooms were placed from photographs one at a time, so their
outer walls do not by themselves form a closed building. The envelope is
made physically coherent in three steps:

1. Shell infill: the side wing is defined as two stacked boxes (lower level
   and upper level) plus the space between the entry block and the wing.
   Every face of those boxes that is open to the outside and not already
   covered by a wall or window gets a plain wall, so the upper floor stands
   on walls and no room hangs in the air.
2. Roofs: one gable over the entry block (extended to meet the wing), one
   over the garage, one front-to-back gable over the whole upper wing, low
   shed roofs over the sunroom, the porch and the lower level's rear ledge.
3. Cladding: outward-facing polygons of every wall box, infill included,
   receive siding or shakes. No doorway, window or browser collision box
   changes. `verify.py` then checks that every upper-floor edge has
   structure beneath it and every ceiling sits under a roof.
"""

import bmesh

EXTERIOR = collection('43 | Exterior roofs and cladding')
siding_grey = material('Pale blue-grey vinyl lap siding', (.46, .52, .56), .55)
siding_tan = material('Warm tan vinyl lap siding', (.60, .52, .40), .55)
shakes = material('Weathered dark exterior panels', (.075, .070, .060), .85)
shingles = material('Brown asphalt roof shingles', (.16, .105, .07), .9, texture='stone')
fascia = white

ROOF_THICKNESS = .14

# ---------------------------------------------------------------- shell infill

# Building blocks in world metres: (x0, x1, y0, y1, z0, z1).
# House Tour 3s shows both upstairs street windows in one flat facade;
# Backyard tour 0/16s also shows one continuous gable. Room depths remain
# estimates: corner windows alone did not establish the former setback.
SHELLS = {
    'Side wing lower level west': (7.8, 15.49, -.23, 9.12, -1.05, 1.26),
    'Side wing lower level east': (15.49, 18.84, -.23, 9.12, -1.05, 1.26),
    'Side wing upper level west': (9.84, 15.49, .29, 8.62, 1.26, 3.70),
    'Side wing upper level east': (15.49, 18.84, .29, 8.62, 1.26, 3.70),
    'Entry block east infill': (7.8, 9.84, -.23, 9.12, 1.26, 2.72),
    'Stairwell head room': (7.73, 11.06, 1.96, 4.72, 1.26, 3.70),
}
# Volumes that count as "already building" when deciding whether a shell
# face looks at the outdoors. Rooms modelled elsewhere plus the shells.
ROOMS = [
    ((0, 0, -3.4), (7.8, 8, 2.7)),          # main block and basement
    ((.8, 8, -.4), (7.4, 11.4, 2.5)),       # sunroom
    ((-6.9, -1.8, -.5), (-.1, 8.1, 2.8)),   # garage
    ((5.1, -1.8, -.25), (7.8, 0, 2.7)),     # enclosed entry return
] + [((x0, y0, z0), (x1, y1, z1)) for x0, x1, y0, y1, z0, z1 in SHELLS.values()]
scene['envelope_boxes'] = json.dumps(ROOMS)  # read back by verify.py

STRUCTURE_COLLECTIONS = ['02 | Main architectural walls', '03 | Cutaway walls - enable for enclosure',
                         '04 | Windows and front door', '05 | Sunroom glazing and house siding',
                         '11 | Split-level stairs and iron rails', '12 | Lower family room architecture',
                         '17 | Upstairs floors and hall', '18 | Upstairs bedroom walls and windows',
                         '22 | Family bathroom fixtures', '23 | Ensuite shower room',
                         '26 | Lower hall and additional room architecture', '35 | Garage shell and doors',
                         '39 | Pink curtain bedroom']
STRUCTURE_KEYS = ['wall', 'pier', 'header', 'base', 'siding', 'opening', 'foundation', 'return',
                  'house side', 'slab', 'window', 'pane', 'jamb', 'door', 'casing', 'sidelight', 'glazing', 'frame']


def _inside(p):
    return any(lo[0] <= p.x <= hi[0] and lo[1] <= p.y <= hi[1] and lo[2] <= p.z <= hi[2] for lo, hi in ROOMS)


bpy.context.view_layer.update()
_boxes = []
for cname in STRUCTURE_COLLECTIONS:
    for o in bpy.data.collections[cname].objects:
        if o.type != 'MESH' or not any(k in o.name.lower() for k in STRUCTURE_KEYS):
            continue
        pts = [o.matrix_world @ Vector(b) for b in o.bound_box]
        _boxes.append((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts),
                       max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))


def _covered(p, pad=.09):
    return any(b[0] - pad <= p.x <= b[3] + pad and b[1] - pad <= p.y <= b[4] + pad and b[2] - pad <= p.z <= b[5] + pad
               for b in _boxes)


asset('Exterior shell infill', photos='exterior', confidence='closes gaps between photographed rooms; unphotographed space, no interior invented')
STEP = .2
infill = 0
for shell_name, (x0, x1, y0, y1, z0, z1) in SHELLS.items():
    faces = [((x0, y0), (x1, y0), (0, -1)), ((x1, y0), (x1, y1), (1, 0)),
             ((x1, y1), (x0, y1), (0, 1)), ((x0, y1), (x0, y0), (-1, 0))]
    for (ax, ay), (bx, by), (nx, ny) in faces:
        length = math.hypot(bx - ax, by - ay)
        columns = max(1, int(round(length / STEP)))
        runs = []  # (column index, z start, z end) of open cells, merged along the face
        for i in range(columns):
            u = (i + .5) / columns
            cx, cy = ax + (bx - ax) * u, ay + (by - ay) * u
            zs = []
            z = z0 + STEP / 2
            while z < z1:
                inside_wall = Vector((cx - nx * .06, cy - ny * .06, z))
                outdoors = Vector((cx + nx * .35, cy + ny * .35, z))
                if not _inside(outdoors) and not _covered(inside_wall):
                    zs.append(z)
                z += STEP
            # contiguous z ranges for this column
            ranges = []
            for z in zs:
                if ranges and abs(ranges[-1][1] - (z - STEP)) < 1e-6:
                    ranges[-1][1] = z
                else:
                    ranges.append([z, z])
            for lo, hi in ranges:
                lo, hi = lo - STEP / 2, hi + STEP / 2
                if runs and runs[-1][0] == i - 1 and abs(runs[-1][2] - lo) < 1e-6 and abs(runs[-1][3] - hi) < 1e-6:
                    runs[-1][0] = i
                    runs[-1][4] += 1
                else:
                    runs.append([i, i, lo, hi, 1])
        for last, _i, lo, hi, count in runs:
            first = last - count + 1
            u0, u1 = first / columns, (last + 1) / columns
            cx, cy = ax + (bx - ax) * (u0 + u1) / 2, ay + (by - ay) * (u0 + u1) / 2
            size = (length * (u1 - u0) + .02, .12, hi - lo) if ny else (.12, length * (u1 - u0) + .02, hi - lo)
            box('Exterior infill wall', (cx - nx * .06, cy - ny * .06, (lo + hi) / 2), size, siding_grey, .004)
            infill += 1
print('EXTERIOR: infill walls', infill, flush=True)

# ---------------------------------------------------------------- roofs


def _roof_mesh(name, verts, faces, slope_faces, cladding=None, clad_faces=()):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    finish(obj, name, fascia)
    mesh.materials.append(shingles)
    if cladding:
        mesh.materials.append(cladding)
    for i, p in enumerate(mesh.polygons):
        if i in slope_faces:
            p.material_index = 1
        elif i in clad_faces:
            p.material_index = 2
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = False
    return obj


def gable(name, x0, x1, y0, y1, base, pitch, ridge='x', cladding=siding_grey, end_cladding=None):
    """Solid gable roof: ridge along ``ridge`` axis, eaves at ``base``. The
    two gable-end triangles are clad (``end_cladding`` overrides the second,
    +axis, end)."""
    t = base - ROOF_THICKNESS
    if ridge == 'x':
        ym, rise = (y0 + y1) / 2, (y1 - y0) / 2 * pitch
        profile = [(y0, t), (y0, base), (ym, base + rise), (y1, base), (y1, t)]
        verts = [(x0, y, z) for y, z in profile] + [(x1, y, z) for y, z in profile]
    else:
        xm, rise = (x0 + x1) / 2, (x1 - x0) / 2 * pitch
        profile = [(x0, t), (x0, base), (xm, base + rise), (x1, base), (x1, t)]
        verts = [(x, y0, z) for x, z in profile] + [(x, y1, z) for x, z in profile]
    n = 5
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]  # gable ends: 0 = low axis end
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, n + i, n + j, j) if ridge == 'x' else (j, n + j, n + i, i))
    obj = _roof_mesh(name, verts, faces, {3, 4}, cladding, {0, 1})
    if end_cladding:
        obj.data.materials.append(end_cladding)
        obj.data.polygons[1].material_index = 3
    return obj


def shed(name, x0, x1, y0, y1, z_high, z_low, down='+y'):
    """Single-slope roof falling toward ``down``; closed on all sides."""
    def top(x, y):
        f = {'+y': (y - y0) / (y1 - y0), '-y': (y1 - y) / (y1 - y0),
             '+x': (x - x0) / (x1 - x0), '-x': (x1 - x) / (x1 - x0)}[down]
        return z_high + (z_low - z_high) * f
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    verts = [(x, y, top(x, y) - ROOF_THICKNESS) for x, y in corners] + [(x, y, top(x, y)) for x, y in corners]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return _roof_mesh(name, verts, faces, {1})


asset('Estimated roofs', photos='exterior', confidence='roof lines read from exterior photographs; pitches and overhangs estimated')
# One long ridge over the entry block, carried east to meet the wing so the
# stair and pink-bedroom infill sits under it; the garage shares the line.
gable('Main block gable roof', -.1, 9.84, -2.3, 8.6, 2.72, (4.50-2.72)/5.45, 'x')
gable('Garage wing gable roof', -7.4, -.1, -2.3, 8.6, 2.72, (4.50-2.72)/5.45, 'x', siding_tan)
# One ridge covers nursery and Cory's room. Front/rear gable topology is
# video-confirmed; width, pitch, overhang and ridge height are fit estimates.
gable('Upper wing gable roof', 9.34, 19.34, -.2, 9.12, 3.75, .37, 'y', siding_grey, shakes)
shed('Sunroom low shingle roof', .3, 7.9, 7.9, 11.9, 2.62, 2.40, '+y')
# The porch is under the continuous low-block roof (House Tour 24/39s).
shed('Entry block rear infill roof', 7.8, 9.84, 8.5, 9.42, 2.74, 2.60, '+y')
# The lower level's rear wall stands half a metre behind the upper wing's;
# a low shingle ledge covers that step.
shed('Lower level rear ledge roof', 9.6, 18.94, 8.5, 9.42, 1.40, 1.26, '+y')

# H3: two separate double-hung windows, each framed by grey louver shutters,
# and a small pale octagonal vent in the common front gable.
shutter_mat=material('Exterior grey green shutter enamel',(.12,.18,.18),.55)
asset('Upper front shutters and gable vent',photos='House Tour 3.000s',
      confidence='pairs of shutters and octagonal vent observed; sizes estimated')
for center,width in [(12.76,1.30),(17.79,1.20)]:
    for side in [-1,1]:
        x=center+side*(width/2+.22)
        box('Street window shutter panel',(x,.20,2.68),(.36,.055,1.44),shutter_mat,.005)
        for dx in [-.158,.158]:box('Shutter stile',(x+dx,.16,2.68),(.035,.035,1.44),shutter_mat,.003)
        for i in range(21):
            obj=box('Shutter angled louver',(x,.158,2.05+i*.062),(.28,.035,.055),shutter_mat,.003)
            obj.rotation_euler.x=math.radians(-18)
obj=cylinder('Octagonal gable vent surround',(14.34,-.222,4.93),.24,.050,white,8)
obj.rotation_euler.x=math.pi/2
obj=cylinder('Octagonal vent dark recess',(14.34,-.253,4.93),.19,.016,shutter_mat,8)
obj.rotation_euler.x=math.pi/2
for i in range(7):
    dz=(i-3)*.047
    width=2*math.sqrt(.18**2-dz**2)
    box('Pale gable vent louver',(14.34,-.268,4.93+dz),(width,.023,.023),white,.003)

# ---------------------------------------------------------------- cladding

CLAD_COLLECTIONS = ['02 | Main architectural walls', '03 | Cutaway walls - enable for enclosure',
                    '05 | Sunroom glazing and house siding', '11 | Split-level stairs and iron rails',
                    '12 | Lower family room architecture', '18 | Upstairs bedroom walls and windows',
                    '26 | Lower hall and additional room architecture', '35 | Garage shell and doors',
                    '39 | Pink curtain bedroom', '17 | Upstairs floors and hall',
                    '22 | Family bathroom fixtures', '23 | Ensuite shower room',
                    '43 | Exterior roofs and cladding']
KEYS = ['wall', 'pier', 'header', 'base', 'siding', 'opening', 'foundation', 'return', 'house side', 'slab']
SKIP = ['skirting', 'trim', 'architrave', 'casing', 'pane', 'glass', 'door', 'window rail', 'jamb', 'mortar']


def _cladding_for(centre, normal):
    if centre.x < .2 and .6 <= centre.y <= 8.6 and centre.z < 2.9:
        return siding_tan
    if centre.x > 9 and centre.z > 1.3 and normal.y > .5:
        return shakes
    return siding_grey


bpy.context.view_layer.update()
clad_faces = 0
for cname in CLAD_COLLECTIONS:
    for o in bpy.data.collections[cname].objects:
        low = o.name.lower()
        if o.type != 'MESH' or not any(k in low for k in KEYS) or any(k in low for k in SKIP):
            continue
        m = o.matrix_world
        rot = m.to_3x3()
        for p in o.data.polygons:
            n = (rot @ p.normal).normalized()
            if abs(n.z) > .5:
                continue
            c = m @ p.center
            if c.z < -.85 or _inside(c + n * .3):
                continue
            mat = _cladding_for(c, n)
            if mat.name not in [s.name for s in o.data.materials if s]:
                o.data.materials.append(mat)
            p.material_index = [s.name for s in o.data.materials].index(mat.name)
            clad_faces += 1
print('EXTERIOR: clad', clad_faces, 'outward wall faces', flush=True)
