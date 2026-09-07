"""Exterior envelope: roofs, cladding on outward wall faces and elevation cameras.

Executed in build.py's Blender namespace after every room and the yard.
The homeowner's exterior photographs (front from the street, rear from the
lawn) show a split-level: a single-storey garage wing and entry block under
one long brown-shingle roof line, a two-storey wing whose rear gable is clad
in dark weathered cedar shakes over pale lap siding, and a glazed sunroom
with a low shingle roof. Street names, house numbers and neighbouring homes
are not reproduced. Roof pitches, overhangs and the split between siding and
shakes are estimates read from the photographs, not measurements.

No wall geometry is added: the outward-facing polygons of the existing wall
boxes are given a cladding material, so doorways, windows and the browser
collision boxes are unchanged.
"""

import bmesh

EXTERIOR = collection('43 | Exterior roofs and cladding')
siding_grey = material('Pale blue-grey vinyl lap siding', (.46, .52, .56), .55)
siding_tan = material('Warm tan vinyl lap siding', (.60, .52, .40), .55)
shakes = material('Weathered dark cedar shakes', (.07, .05, .035), .85, texture='wood')
shingles = material('Brown asphalt roof shingles', (.16, .105, .07), .9, texture='stone')
fascia = white

ROOF_THICKNESS = .14


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


def gable(name, x0, x1, y0, y1, base, pitch, ridge='x', cladding=siding_grey):
    """Solid gable roof: ridge along ``ridge`` axis, eaves at ``base``, closed
    gable ends clad from the eave line down to nothing (the wall below
    carries its own cladding)."""
    t = base - ROOF_THICKNESS
    if ridge == 'x':
        ym, rise = (y0 + y1) / 2, (y1 - y0) / 2 * pitch
        top = base + rise
        # Profile in the YZ plane extruded along X: bottom corners, eaves, ridge.
        profile = [(y0, t), (y0, base), (ym, top), (y1, base), (y1, t)]
        verts = [(x0, y, z) for y, z in profile] + [(x1, y, z) for y, z in profile]
    else:
        xm, rise = (x0 + x1) / 2, (x1 - x0) / 2 * pitch
        top = base + rise
        profile = [(x0, t), (x0, base), (xm, top), (x1, base), (x1, t)]
        verts = [(x, y0, z) for x, z in profile] + [(x, y1, z) for x, z in profile]
    n = 5
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]  # gable ends
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, n + i, n + j, j) if ridge == 'x' else (j, n + j, n + i, i))
    # Side faces: 0-1 eave edge, 1-2 slope, 2-3 slope, 3-4 eave edge, 4-0 underside.
    slope = {3, 4}
    clad = {0, 1}
    return _roof_mesh(name, verts, faces, slope, cladding, clad)


def shed(name, x0, x1, y0, y1, z_high, z_low, down='+y'):
    """Single-slope roof falling toward ``down``; closed on all sides."""
    def top(x, y):
        if down == '+y':
            f = (y - y0) / (y1 - y0)
        elif down == '-y':
            f = (y1 - y) / (y1 - y0)
        elif down == '+x':
            f = (x - x0) / (x1 - x0)
        else:
            f = (x1 - x) / (x1 - x0)
        return z_high + (z_low - z_high) * f
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    verts = [(x, y, top(x, y) - ROOF_THICKNESS) for x, y in corners] + [(x, y, top(x, y)) for x, y in corners]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return _roof_mesh(name, verts, faces, {1})


asset('Estimated roofs', photos='exterior', confidence='roof lines read from exterior photographs; pitches and overhangs estimated')
# One long ridge over the entry block and garage wing, seen from the street.
gable('Main block gable roof', -.5, 8.3, -.5, 8.6, 2.72, .42, 'x')
gable('Garage wing gable roof', -7.4, .2, .6, 8.6, 2.76, .42, 'x', siding_tan)
# Two-storey wing: ridge front-to-back, rear gable clad in cedar shakes.
o = gable('Upper wing gable roof', 9.3, 15.99, -.2, 9.05, 3.75, .55, 'y', shakes)
o.data.polygons[0].material_index = 2  # front gable end reads as the same shakes
gable('End bedroom cross gable', 12.65, 19.4, 1.4, 7.0, 3.75, .55, 'x')
shed('Ensuite shed roof', 11.74, 14.24, 8.9, 12.2, 4.55, 3.78, '+y')
shed('Sunroom low shingle roof', .3, 7.9, 7.9, 11.9, 2.72, 2.45, '+y')
shed('Front porch shingle roof', 4.1, 7.9, -3.05, 0, 2.55, 2.15, '-y')
shed('Pink bedroom low roof', 7.6, 9.95, 5.3, 9.4, 1.38, 1.22, '+y')
shed('Lower east rooms low roof', 15.9, 17.1, 6.9, 9.5, 1.38, 1.22, '+y')
shed('Stairwell flat cap', 7.5, 9.45, 1.75, 4.95, 3.76, 3.70, '+x')

# Cladding on outward wall faces. A face is exterior when the point a short
# distance along its normal lies inside no room volume and above the lawn.
ROOMS = [
    ((0, 0, -3.4), (7.8, 8, 2.7)),          # main block and basement
    ((.8, 8, -.4), (7.4, 11.4, 2.5)),       # sunroom
    ((-6.9, 1.1, -.5), (-.1, 8.1, 2.8)),    # garage
    ((9.69, -.23, -1.4), (14.83, 4.67, 1.3)),   # lower family room
    ((9.69, 4.39, -1.4), (16.63, 9.11, 1.3)),   # lower hall, bedroom, bathroom
    ((7.79, 5.47, -1.4), (10.91, 9.12, 1.3)),   # pink bedroom
    ((7.73, 1.96, -1.4), (11.06, 4.72, 3.7)),   # stairwell
    ((9.84, .29, 1.1), (15.49, 8.7, 3.8)),       # nursery, hall, primary, bath
    ((15.49, 1.8, 1.1), (18.92, 6.5, 3.8)),      # end bedroom
    ((12.16, 8.5, 1.1), (13.81, 11.73, 3.8)),    # ensuite
    ((4.3, -2.9, -.4), (7.7, 0, 2.5)),           # covered porch
]
CLAD_COLLECTIONS = ['02 | Main architectural walls', '03 | Cutaway walls - enable for enclosure',
                    '05 | Sunroom glazing and house siding', '11 | Split-level stairs and iron rails',
                    '12 | Lower family room architecture', '18 | Upstairs bedroom walls and windows',
                    '26 | Lower hall and additional room architecture', '35 | Garage shell and doors',
                    '39 | Pink curtain bedroom', '17 | Upstairs floors and hall',
                    '22 | Family bathroom fixtures', '23 | Ensuite shower room']
KEYS = ['wall', 'pier', 'header', 'base', 'siding', 'opening', 'foundation', 'return', 'house side', 'slab']
SKIP = ['skirting', 'trim', 'architrave', 'casing', 'pane', 'glass', 'door', 'window rail', 'jamb', 'mortar']


def _inside(p):
    return any(lo[0] <= p.x <= hi[0] and lo[1] <= p.y <= hi[1] and lo[2] <= p.z <= hi[2] for lo, hi in ROOMS)


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
