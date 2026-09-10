"""Small, explicit real-time finish descriptions for the procedural house.

No Blender import: the classification contract can be checked without building
the house. Colours stay in Blender's linear working space. Shader-node defaults
are only read when their sockets are unlinked; linked values are represented by
the named finish's calibrated average, not the unused socket default.
"""
import re
import math


def oriented_triangle_corners(vertices, loops, mirrored=False):
    """Keep transformed face winding aligned with inverse-transpose normals.

    Vertex and split-normal loop indices must travel together. Use the same
    order for the visible mesh and AO occluder faces after a reflected transform.
    """
    corners = list(zip(vertices, loops))
    return corners[::-1] if mirrored else corners


def finish_for_name(name):
    n = name.lower()
    finish = dict(surface='plain', roughness=.7, metalness=0.0, clearcoat=0.0,
                  clearcoatRoughness=.2, opacity=1.0, emissive=[0, 0, 0],
                  emissiveIntensity=0.0, grainAxis='x')
    if n == 'window glass':
        finish.update(surface='glass', roughness=.08, opacity=.20, clearcoat=1.0)
    elif n == 'dark appliance glass':
        finish.update(surface='screen', roughness=.09, clearcoat=1.0)
    elif n == 'silver mirror':
        finish.update(surface='metal', roughness=.035, metalness=1.0)
    elif 'stainless' in n:
        finish.update(surface='brushed', roughness=.30, metalness=1.0)
    elif n == 'warm brass':
        finish.update(surface='metal', roughness=.32, metalness=1.0)
    elif n == 'black iron':
        finish.update(roughness=.42, metalness=.35)
    elif n in {'warm glowing bulb', 'warm lit diffuser', 'fairy light bulb'}:
        finish.update(roughness=.4, emissive=[1, .79, .52],
                      emissiveIntensity=3.0 if n != 'warm lit diffuser' else 1.2)
    elif n == 'cool basement led emitters':
        finish.update(roughness=.4, emissive=[.58, .70, 1.0], emissiveIntensity=3.0)
    elif n == 'warm linen lampshade':
        finish.update(surface='fabric', roughness=.9, emissive=[1, .72, .40],
                      emissiveIntensity=.16, sheen=.4)
    elif 'painted foundation blocks' in n:
        finish.update(surface='blocks', roughness=.82)
    elif 'vinyl lap siding' in n:
        finish.update(surface='siding', roughness=.52, clearcoat=.1)
    elif n == 'weathered dark exterior panels':
        finish.update(surface='panels', roughness=.82)
    elif 'cedar shakes' in n:
        finish.update(surface='shakes', roughness=.87)
    elif 'shingles' in n:
        finish.update(surface='roof', roughness=.93)
    elif 'lawn' in n:
        finish.update(surface='lawn', roughness=1.0)
    elif re.search(r'leaves|foliage|needles', n):
        finish.update(surface='foliage', roughness=.8, doubleSided=True)
    elif 'carpet' in n:
        finish.update(surface='carpet', roughness=.95, sheen=.8)
    elif re.search(r'upholstery|cushions|curtains|bedding|sofa|olive chair|cotton|sunroom mat', n):
        finish.update(surface='fabric', roughness=.88, sheen=.5)
    elif re.search(r'oak|walnut|varnished pine|laminate planks|wicker|timber joists|tree bark', n):
        finish.update(surface='wood', roughness=.32, clearcoat=.3)
        if re.search(r'wicker|joists|bark', n):
            finish.update(roughness=.8, clearcoat=0.0)
        if re.search(r'pine|bark', n):
            finish['grainAxis'] = 'y'  # Blender vertical Z is browser Y.
    elif 'countertop' in n:
        finish.update(surface='stone', roughness=.18, clearcoat=.6)
    elif re.search(r'ceramic|porcelain|glazed tile|accent tile', n):
        finish.update(surface='ceramic', roughness=.12, clearcoat=.7)
    elif re.search(r'concrete|asphalt|pavers|mulch|grout', n):
        finish.update(surface='mineral', roughness=.93)
    elif re.search(r'plaster|enamel|vanity cabinet|front door|shelving|vehicle paint', n):
        glossy = bool(re.search(r'enamel|cabinet|front door|shelving|vehicle', n))
        finish.update(surface='paint', roughness=.32 if glossy else .62,
                      clearcoat=.3 if glossy else 0.0)
    return finish


def material_finish(mat):
    finish = finish_for_name(mat.name if mat else 'Default')
    if mat and mat.use_nodes and mat.node_tree:
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            for socket, prop in [('Roughness', 'roughness'), ('Metallic', 'metalness'),
                                 ('Coat Weight', 'clearcoat'),
                                 ('Coat Roughness', 'clearcoatRoughness')]:
                value = bsdf.inputs.get(socket)
                if value is not None and not value.is_linked:
                    finish[prop] = round(float(value.default_value), 4)
        if finish['surface'] == 'panels':
            brick = next((n for n in mat.node_tree.nodes if n.type == 'TEX_BRICK'), None)
            if brick:
                scale = max(.0001, float(brick.inputs['Scale'].default_value))
                finish['panelSize'] = [round(float(brick.inputs[key].default_value) / scale, 5)
                    for key in ['Brick Width', 'Row Height', 'Mortar Size']]
                finish['panelOffset'] = float(brick.offset)
                finish['mortarColor'] = list(brick.inputs['Mortar'].default_value[:3])
    # Thin window panes use alpha + reflection rather than a costly full-screen
    # transmission pass. Dark display glass deliberately remains opaque.
    if finish['surface'] == 'glass':
        finish['roughness'] = max(.06, finish['roughness'])
    return finish


def keep_bevel(name, collection, dimensions, vertex_count):
    """Spend silhouette/detail triangles on near furniture, not every plank."""
    n = name.lower()
    if vertex_count > 64 or min(dimensions) < .016 or max(dimensions) > 3.0:
        return False
    if collection.startswith(('02 |', '03 |', '07 |', '14 |', '17 |', '24 |',
                              '28 |', '30 |', '34 |', '35 |', '37 |', '40 |',
                              '42 |', '43 |')):
        return False
    return bool(re.search(r'cabinet|drawer|counter|table|chair|sofa|bed|dresser|'
                          r'vanity|mantel|piano|door|frame|shelf|shelving|crib|'
                          r'bench|stool|arm|cushion|seat|rail|trim', n))


def practical_light(name, kind, energy):
    return kind in {'POINT', 'SPOT', 'AREA'} and energy > 0 and name not in {
        'Large softbox daylight', 'Sunroom daylight', 'Front daylight'}


def ramp_colliders(name, vertices, axis, spacing=.10):
    """Approximate an explicitly marked rectangular planar walking surface.

    Input vertices use world-space Blender axes. The property names the world
    horizontal slope axis ('x' or 'y'); output uses browser (X,Z,-Y) coordinates.
    Each strip has a 6 cm collision thickness and a midpoint surface height.
    The visible mesh is unchanged. Reject ambiguous geometry rather than
    silently filling a triangle, twisted surface or solid object's whole box.
    """
    if axis not in {'x', 'y'} or not 0 < spacing <= .10:
        raise ValueError(name + ': invalid browser walking ramp axis/spacing')
    points = [tuple(p) for p in vertices]
    if len(points) < 4 or any(not math.isfinite(v) for p in points for v in p):
        raise ValueError(name + ': walking ramp requires finite rectangle vertices')
    along = 0 if axis == 'x' else 1
    across = 1 - along
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    length = hi[along] - lo[along]
    if length < .001 or hi[across] - lo[across] < .001:
        raise ValueError(name + ': degenerate walking ramp')
    start = [p[2] for p in points if abs(p[along] - lo[along]) < 1e-5]
    end = [p[2] for p in points if abs(p[along] - hi[along]) < 1e-5]
    z0, z1 = max(start), max(end)
    height = lambda t: z0 + (z1 - z0) * t
    if any(abs(p[2] - height((p[along] - lo[along]) / length)) > 1e-5 for p in points):
        raise ValueError(name + ': walking ramp must be a planar top surface')
    for x in [lo[0], hi[0]]:
        for y in [lo[1], hi[1]]:
            if not any(abs(p[0] - x) < 1e-5 and abs(p[1] - y) < 1e-5 for p in points):
                raise ValueError(name + ': walking ramp must have a rectangular footprint')
    count = max(math.ceil(length / spacing), math.ceil(abs(z1 - z0) / .12), 1)
    if count > 1000:
        raise ValueError(name + ': walking ramp exceeds 1000 collision strips')
    boxes = []
    for i in range(count):
        bottom, top = lo.copy(), hi.copy()
        bottom[along] = lo[along] + length * i / count
        top[along] = lo[along] + length * (i + 1) / count
        z = height((i + .5) / count)
        boxes.append({'name': name + ' walk strip %03d' % i,
                      'min': [bottom[0], z - .06, -top[1]],
                      'max': [top[0], z, -bottom[1]]})
    return boxes
