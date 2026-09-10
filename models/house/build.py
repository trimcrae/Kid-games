"""Photo-based house study. Run with Blender 4.5 LTS, not system Python.

blender --background --python models/house/build.py -- --render
All dimensions are approximate metres. No source photos or external textures.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import sys

import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--render', action='store_true')
parser.add_argument('--views', default='overview,plan,entry,sunroom,kitchen,living,family,stairs,upper_overview,upper_plan,hall,bathroom,nursery,bedroom,cory_nook,primary,ensuite,porch,lower_bedroom,lower_bathroom,garage,garage_rear,basement_play,basement_office,basement_laundry,basement_plan,basement_stairs,pink_bedroom,lower_entry,kitchen_access,basement_entry,front_yard,back_yard,street_front,rear_elevation')
parser.add_argument('--samples', type=int, default=48)
parser.add_argument('--preview-scale', type=int, default=100, help='Render percentage; use 50 for fast layout checks')
args = parser.parse_args(ARGS)
random.seed(14)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.length_unit = 'METERS'
scene.render.engine = 'CYCLES'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.device = 'CPU'
scene.render.resolution_x = 1600
scene.render.resolution_y = 1100
scene.render.resolution_percentage = args.preview_scale
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('Soft daylight')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.73, .82, .93, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45

COLL = None
ROOT = None
ASSETS = []


def collection(name):
    global COLL, ROOT
    COLL = bpy.data.collections.new(name)
    scene.collection.children.link(COLL)
    ROOT = None
    return COLL


def asset(name, location=(0, 0, 0), angle=0, photos='', confidence='photo / estimated size'):
    global ROOT
    ROOT = bpy.data.objects.new(name, None)
    COLL.objects.link(ROOT)
    ROOT.location = location
    ROOT.rotation_euler.z = math.radians(angle)
    ROOT.empty_display_type = 'PLAIN_AXES'
    ROOT.empty_display_size = .15
    ROOT['reference_photos'] = photos
    ROOT['confidence'] = confidence
    ASSETS.append({'name': ROOT.name, 'collection': COLL.name, 'photos': photos,
                   'confidence': confidence, 'location_m': list(location)})
    return ROOT


def finish(obj, name, mat=None):
    obj.name = name
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    COLL.objects.link(obj)
    if ROOT:
        obj.parent = ROOT
    if mat:
        obj.data.materials.append(mat)
    return obj


def box(name, loc, size, mat, bevel=.012):
    x, y, z = (s / 2 for s in size)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z),
                      (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)], [],
                     [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                      (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    finish(obj, name, mat)
    if bevel:
        mod = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod = obj.modifiers.new('Corner normals', 'WEIGHTED_NORMAL')
    return obj


def cylinder(name, loc, radius, depth, mat, vertices=24, top=None):
    n = vertices
    verts = [(r * math.cos(i * math.tau / n), r * math.sin(i * math.tau / n), z)
             for r, z in [(radius, -depth / 2), (radius if top is None else top, depth / 2)]
             for i in range(n)]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    finish(obj, name, mat)
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return obj


def rod(name, a, b, radius, mat):
    a, b = Vector(a), Vector(b)
    obj = cylinder(name, (a + b) / 2, radius, (b - a).length, mat, 16)
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    return obj


def curve(name, pts, radius, mat, cyclic=False):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spl = data.splines.new('POLY')
    spl.points.add(len(pts) - 1)
    for p, xyz in zip(spl.points, pts):
        p.co = (*xyz, 1)
    spl.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    COLL.objects.link(obj)
    if ROOT:
        obj.parent = ROOT
    data.materials.append(mat)
    return obj


def sphere(name, loc, size, mat):
    n, rings = 20, 12
    verts = [(0, 0, 1)]
    verts += [(math.sin(j * math.pi / rings) * math.cos(i * math.tau / n),
               math.sin(j * math.pi / rings) * math.sin(i * math.tau / n),
               math.cos(j * math.pi / rings)) for j in range(1, rings) for i in range(n)]
    verts.append((0, 0, -1))
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    for j in range(rings - 2):
        a, b = 1 + j * n, 1 + (j + 1) * n
        faces += [(a + i, b + i, b + (i + 1) % n, a + (i + 1) % n) for i in range(n)]
    last = 1 + (rings - 2) * n
    faces += [(len(verts) - 1, last + (i + 1) % n, last + i) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    finish(obj, name, mat)
    obj.scale = size
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def material(name, color, rough=.5, metallic=0, texture=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nt = mat.node_tree
    bs = nt.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metallic
    if texture:
        tex = nt.nodes.new('ShaderNodeTexNoise')
        tex.inputs['Scale'].default_value = 5 if texture == 'wood' else 100
        tex.inputs['Detail'].default_value = 2
        coord = nt.nodes.new('ShaderNodeTexCoord')
        mapping = nt.nodes.new('ShaderNodeVectorMath')
        mapping.operation = 'MULTIPLY'
        mapping.inputs[1].default_value = (3, 45, 3) if texture == 'wood' else (1, 1, 1)
        nt.links.new(coord.outputs['Generated'], mapping.inputs[0])
        nt.links.new(mapping.outputs[0], tex.inputs['Vector'])
        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = .2
        low, high = (.98, 1.02) if texture == 'plaster' else (.72, 1.15)
        ramp.color_ramp.elements[0].color = (*(v * low for v in color), 1)
        ramp.color_ramp.elements[1].position = .8
        ramp.color_ramp.elements[1].color = (*(min(v * high, 1) for v in color), 1)
        nt.links.new(tex.outputs['Fac'], ramp.inputs[0])
        nt.links.new(ramp.outputs[0], bs.inputs['Base Color'])
        bump = nt.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .2
        bump.inputs['Distance'].default_value = {'wood': .008, 'plaster': .001,
                                                 'stone': .002}.get(texture, .015)
        nt.links.new(tex.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(bump.outputs[0], bs.inputs['Normal'])
    return mat


white = material('Warm white enamel', (.83, .82, .73))
wall = material('Pale sage plaster', (.56, .60, .48), .85, texture='plaster')
cream = material('Warm dining plaster', (.68, .64, .49), .85)
oak = material('Honey oak grain', (.42, .23, .09), texture='wood')
pine = material('Climbing frame varnished pine', (.59, .34, .12), .32, texture='wood')
walnut = material('Dark walnut', (.17, .075, .035), .3, texture='wood')
wicker = material('Natural wicker', (.31, .17, .075), .7, texture='wood')
rattan = material('Wicker weave highlights', (.46, .29, .13), .7)
black = material('Black iron', (.022, .027, .025), .38, .55)
steel = material('Brushed stainless', (.48, .53, .54), .26, .82)
brass = material('Warm brass', (.52, .34, .105), .3, .75)
glass = material('Window glass', (.82, .94, .95), .08)
glass.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value = 1
glass.node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value = 1.45
mirror = material('Silver mirror', (.82, .86, .88), .06, 1)
screen = material('Dark appliance glass', (.012, .023, .03), .17, .25)
linen = material('Oatmeal sofa upholstery', (.48, .45, .38), .85, texture='fabric')
bluegrey = material('Sunroom blue grey cushions', (.27, .38, .41), .8, texture='fabric')
navy = material('Small sofa deep teal blue', (.025, .135, .205), .78, texture='fabric')
green = material('Family room olive chair', (.13, .20, .14), .86, texture='fabric')
carpet = material('Clean warm beige carpet', (.47, .41, .31), .95, texture='fabric')
red = material('Front door berry red', (.61, .018, .065), .35)
shade = material('Warm linen lampshade', (.91, .73, .39), .85)
counter = material('Pale speckled stone countertop', (.74, .77, .72), .3, texture='stone')
tilewhite = material('Ivory ceramic', (.86, .85, .77), .32)
tilegrey = material('Muted grey tile pattern', (.30, .35, .33), .6)
grout = material('Warm grey grout', (.42, .45, .41), .9)
foam = [material('Sunroom mat ' + str(i), c, .95, texture='fabric') for i, c in enumerate([
    (.55, .53, .46), (.47, .52, .50), (.62, .59, .50)])]
holds = [material('Climbing hold ' + n, c, .6) for n, c in [
    ('yellow', (.93, .64, .02)), ('red', (.65, .025, .045)),
    ('teal', (.012, .20, .17)), ('blue', (.018, .14, .45))]]


def wallbox(name, loc, size, mat=wall):
    return box(name, loc, size, mat, .004)


def panel(name, x, y, z, width, height, mat=white):
    """Raised cabinet/door panel, front faces local -Y."""
    box(name, (x, y, z), (width, .035, height), mat, .008)
    box(name + ' raised inset', (x, y - .025, z), (width - .10, .018, height - .10), mat, .012)


def frame(name, loc, width, height, mat=walnut, fill=mirror):
    x, y, z = loc
    box(name + ' face', (x, y, z), (width, .03, height), fill, .002)
    for dx in [-width / 2, width / 2]:
        box(name + ' upright', (x + dx, y - .024, z), (.065, .075, height + .08), mat)
    for dz in [-height / 2, height / 2]:
        box(name + ' rail', (x, y - .024, z + dz), (width, .075, .065), mat)


def table(name, pos, size, mat=walnut, angle=0, photos='6,7'):
    asset(name, pos, angle, photos)
    w, d, h = size
    box('Tabletop', (0, 0, h - .035), (w, d, .07), mat, .025)
    for x in [-w / 2 + .10, w / 2 - .10]:
        for y in [-d / 2 + .10, d / 2 - .10]:
            box('Square table leg', (x, y, (h - .08) / 2), (.065, .065, h - .08), mat)
    for y in [-d / 2 + .08, d / 2 - .08]:
        box('Table apron', (0, y, h - .15), (w - .16, .035, .16), mat)


def sofa(name, pos, width, upholstery, angle=0, photos='8', woven=False):
    asset(name, pos, angle, photos)
    body = wicker if woven else upholstery
    depth = .86 if width > 1.5 else .70
    box('Seat foundation', (0, 0, .29), (width, depth, .25), body, .06)
    box('Upholstered back' if not woven else 'Woven back', (0, depth / 2 - .075, .67),
        (width, .16, .68), body, .06)
    for x in [-width / 2 + .10, width / 2 - .10]:
        box('Arm', (x, 0, .54), (.20, depth, .36), body, .08 if not woven else .03)
        for y in [-depth / 2 + .1, depth / 2 - .1]:
            box('Foot', (x, y, .095), (.075, .075, .19), walnut)
    count = 3 if width > 2 else (2 if width > 1.15 else 1)
    cw = (width - .43) / count
    for i in range(count):
        x = -(width - .43) / 2 + cw * (i + .5)
        box('Separate seat cushion', (x, -.06, .46), (cw - .016, depth - .22, .18), upholstery, .065)
        back = box('Separate back cushion', (x, depth / 2 - .20, .76),
                   (cw - .012, .18, .48), upholstery, .075)
        back.rotation_euler.x = math.radians(-8)
    if woven:
        for side in [-1, 1]:
            x = side * (width / 2 + .002)
            for i in range(33):
                y = -depth / 2 + .02 + i * (depth - .04) / 32
                rod('Vertical wicker strand', (x, y, .30), (x, y, .72), .004, rattan)
            for i in range(23):
                z = .30 + i * .019
                rod('Horizontal wicker strand', (x, -depth / 2, z), (x, depth / 2, z), .004, rattan)


def lamp(name, pos, height=1.6, angle=0, photos='3,5,7,8', double=False):
    asset(name, pos, angle, photos)
    cylinder('Weighted base', (0, 0, .035), .20 if height > 1 else .12, .07, brass)
    rod('Lamp stem', (0, 0, .05), (0, 0, height - .2), .017, steel if double else brass)
    if double:
        for z, side in [(height - .1, 1), (height - .55, -1)]:
            rod('Adjustable arm', (0, 0, z - .16), (.20 * side, 0, z - .16), .014, steel)
            cylinder('White cup shade', (.20 * side, 0, z), .13, .24, white, top=.20)
    else:
        # Open conical fabric shade; a separate bulb supplies actual light.
        z = height - .22
        n = 48
        verts = [(r * math.cos(i * math.tau / n), r * math.sin(i * math.tau / n), zz)
                 for r, zz in [(.28, z - .20), (.21, z + .20)] for i in range(n)]
        mesh = bpy.data.meshes.new('Open shade mesh')
        mesh.from_pydata(verts, [], [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)])
        obj = bpy.data.objects.new('Open linen shade', mesh)
        COLL.objects.link(obj)
        obj.parent = ROOT
        mesh.materials.append(shade)
        sphere('Bulb', (0, 0, z), (.045, .045, .065), white)
        data = bpy.data.lights.new(name + ' warm bulb', 'POINT')
        data.energy = 22
        data.color = (1, .77, .44)
        data.shadow_soft_size = .10
        obj = bpy.data.objects.new(name + ' warm bulb', data)
        COLL.objects.link(obj)
        obj.parent = ROOT
        obj.location = (0, 0, z)


def chest(name, pos, width=.9, height=1.2, angle=0, rows=5, columns=1, photos='7'):
    asset(name, pos, angle, photos)
    box('Cabinet carcass', (0, 0, height / 2), (width, .43, height), walnut, .018)
    box('Overhanging top', (0, 0, height), (width + .05, .47, .045), oak)
    for row in range(rows):
        for col in range(columns):
            w = (width - .08) / columns
            h = (height - .16) / rows
            x = -width / 2 + .04 + (col + .5) * w
            z = .08 + (row + .5) * h
            panel('Drawer', x, -.235, z, w - .018, h - .018, oak)
            sphere('Drawer knob', (x, -.281, z), (.02, .02, .02), brass)


def window(name, pos, width, height, angle=0, divided=True, blinds=True):
    asset(name, pos, angle, '1-5' if not divided else '7,8')
    box('Clear pane', (0, 0, 0), (width, .012, height), glass, 0)
    for x in [-width / 2, width / 2]:
        box('White jamb', (x, -.01, 0), (.06, .10, height + .09), white)
    for z in [-height / 2, height / 2]:
        box('Window rail', (0, -.01, z), (width, .10, .06), white)
    if divided:
        box('Sash meeting rail', (0, -.04, 0), (width, .07, .04), white)
        for x in [-width / 6, width / 6]:
            box('Vertical muntin', (x, -.026, 0), (.015, .025, height), white, .002)
        for z in [-height / 3, height / 3]:
            box('Horizontal muntin', (0, -.026, z), (width, .025, .015), white, .002)
    if blinds:
        for i in range(16):
            box('Pleated blind', (0, -.09, height / 2 - .02 - .019 * i),
                (width + .025, .034, .018), white, .003)
    box('Sill', (0, -.07, -height / 2 - .02), (width + .14, .20, .04), white)


def area(name, pos, target, energy, size):
    global ROOT
    ROOT = None
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    COLL.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


# FLOOR PLAN: front is -Y, rear is +Y. Foyer/living/dining at Z=0,
# lower family room Z=-1.05, upper landing Z=1.26, sunroom Z=-.10.
# Room extents are explicitly estimates; there is no exterior survey.
collection('01 | Floors and split levels')
asset('Main level floor', photos='6,7,8', confidence='inferred footprint')
wallbox('Main subfloor', (3.9, 4, -.13), (7.8, 8, .24), walnut)
# House Tour 24/39s: the entrance faces across the covered porch. Its short
# enclosed return joins the existing foyer; 1.8 m depth is an estimate.
wallbox('Entry return subfloor', (6.45, -.90, -.13), (2.7, 1.8, .24), walnut)
# The paired flights leave the SIDE of the main rectangle (Photo 7).
planks = [material('Oak floor board tone %02d' % i, (.35 + .024 * i, .18 + .014 * i, .07 + .008 * i),
                    .46, texture='wood') for i in range(8)]
for row in range(40):
    y = .10 + row * .20
    for col in range(8):
        x1, x2 = col * 1.15 - (row % 3) * .37, (col + 1) * 1.15 - (row % 3) * .37
        x1, x2 = max(0, x1), min(7.8, x2)
        if x2 <= x1:
            continue
        if x2 > x1:
            box('Individual oak floorboard', ((x1 + x2) / 2, y, .002),
                (x2 - x1 - .003, .197, .015), random.choice(planks), .001)
for row in range(9):
    for col in range(3):
        box('Entry return oak floorboard', (5.55+col*.90, -1.70+row*.20, .002),
            (.897, .197, .015), random.choice(planks), .001)
asset('Lower family room floor', (-.7, 0, 0), photos='9,10', confidence='inferred footprint')
wallbox('Lower foundation', (1.0, -1.2, -1.2), (4.6, 5, .30), walnut)
box('Family room fitted carpet', (1.0, -1.2, -1.042), (4.6, 5, .024), carpet, .002)
asset('Sunroom foam flooring', photos='5', confidence='photo / estimated 6.6 x 3.4 m')
wallbox('Sunroom foundation', (4.1, 9.7, -.25), (6.6, 3.4, .30), walnut)
for i in range(11):
    for j in range(6):
        box('Clean square foam mat', (1.1 + i * .60, 8.2833 + j * .56667, -.09),
            (.596, .563, .023), foam[(i + j) % 3], .004)

collection('02 | Main architectural walls')
asset('Main walls', photos='6-10', confidence='estimated shell with observed openings')
wallbox('Living room mirror wall', (-.07, 2.22, 1.3), (.14, 4.44, 2.6))
wallbox('Kitchen sink wall', (-.07, 6.25, 1.3), (.14, 3.62, 2.6))
wallbox('Dining storage wall', (7.87, 6.30, 1.3), (.14, 3.4, 2.6), cream)
wallbox('Foyer side wall', (7.87, .96, 1.3), (.14, 1.92, 2.6), cream)
wallbox('Entry return east wall', (7.87, -.90, 1.3), (.14, 1.80, 2.6), cream)
# Rear access is through dining. The house window left of it is visible in Photo 1.
wallbox('Rear wall window base', (2.32, 8.04, .32), (4.64, .14, .64), cream)
wallbox('Rear wall window header', (2.32, 8.04, 2.43), (4.64, .14, .34), cream)
for x, w in [(.36, .72), (3.655, 1.97)]:
    wallbox('Rear wall beside house window', (x, 8.04, 1.44), (w, .14, 1.6), cream)
wallbox('Rear wall right of porch door', (6.78, 8.04, 1.3), (2.04, .14, 2.6), cream)
wallbox('Porch doorway header', (5.20, 8.04, 2.4), (1.12, .14, .4), cream)
for x in [4.62, 5.78]:
    box('Porch door casing', (x, 7.94, 1.1), (.075, .065, 2.2), white)
wallbox('Kitchen front partition', (1.62, 4.44, 1.3), (3.24, .14, 2.6), cream)
wallbox('Kitchen gallery pier', (3.34, 4.72, 1.3), (.22, .62, 2.6), cream)
wallbox('Kitchen entry soffit', (3.34, 6.515, 2.47), (.22, 2.97, .26), cream)
box('Living side skirting', (.025, 2.22, .065), (.04, 4.44, .13), white)
box('Piano wall skirting', (1.62, 4.35, .065), (3.24, .04, .13), white)

cutaway = collection('03 | Cutaway walls - enable for enclosure')
asset('Front facade with real window openings', photos='7,8', confidence='window arrangement observed; spacing estimated')
wallbox('Front wall below windows', (2.55, -.06, .30), (5.10, .14, .60))
wallbox('Front wall above windows', (2.55, -.06, 2.43), (5.10, .14, .34))
for x, width in [(.35, .70), (2.175, .15), (4.375, 1.45)]:
    wallbox('Front window pier', (x, -.06, 1.43), (width, .14, 1.66))
wallbox('Entry return door header', (5.10, -.90, 2.39), (.14, 1.0, .42))
for y in [-1.60, -.20]:
    wallbox('Entry return door pier', (5.10, y, 1.3), (.14, .40, 2.6))
wallbox('Entry window base', (6.45, -1.86, .645), (2.7, .14, 1.29))
wallbox('Entry window header', (6.45, -1.86, 2.305), (2.7, .14, .59))
wallbox('Entry window left pier', (5.69, -1.86, 1.65), (1.18, .14, .72))
wallbox('Entry window right pier', (7.40, -1.86, 1.65), (.80, .14, .72))

collection('04 | Windows and front door')
window('Front living left window', (1.40, -.045, 1.43), 1.40, 1.62, 180)
window('Front living right window', (2.95, -.045, 1.43), 1.40, 1.62, 180)
window('Entry side window', (6.64, -1.845, 1.65), .72, .72, 180)
window('House rear window visible from sunroom', (1.695, 8.17, 1.44), 1.95, 1.60, 180)
asset('Red three-panel front door', (5.10, -.90, 0), 90, '7; House Tour 24.003/39.005s',
      'perpendicular return confirmed in video; dimensions estimated')
box('Red door slab', (0, 0, 1.065), (.98, .07, 2.13), red)
for z in [.40, 1.04, 1.68]:
    panel('Red raised panel', 0, -.05, z, .76, .49, red)
    # Small inset rosette motif in each of the photographed three panels.
    for i in range(8):
        a = i * math.tau / 8
        sphere('Door rosette petal', (.038 * math.cos(a), -.084, z + .038 * math.sin(a)), (.018, .008, .027), red)
sphere('Brass entry knob', (-.37, -.10, 1.0), (.035, .035, .035), brass)
cylinder('Deadbolt', (-.37, -.09, 1.16), .032, .025, brass).rotation_euler.x = math.pi / 2
for x in [-.54, .54]:
    box('Front door white casing', (x, -.01, 1.1), (.07, .10, 2.2), white)
box('Front door white header', (0, -.01, 2.18), (1.14, .10, .07), white)

collection('05 | Sunroom glazing and house siding')
asset('Sunroom aluminum frame', photos='1-5', confidence='three glazed sides observed; bay count estimated')
for x in [.8, 7.4]:
    for y in [8.12, 11.4]:
        box('Corner post', (x, y, 1.08), (.09, .09, 2.36), white)
for y in [8.12, 11.4]:
    box('Long ceiling beam', (4.1, y, 2.25), (6.68, .12, .20), white)
for x in [.8, 7.4]:
    box('Side ceiling beam', (x, 9.76, 2.25), (.12, 3.4, .20), white)
for i in range(13):
    z = .02 + i * .17
    box('House lap siding beside window', (3.655, 8.13, z), (1.97, .045, .18), white, .003)
    box('House lap siding right', (6.58, 8.13, z), (1.64, .045, .18), white, .003)
    if z < .56 or z > 2.20:
        box('House lap siding below or above window', (1.745, 8.13, z), (1.85, .045, .18), white, .003)
for i in range(6):
    window('Sunroom rear sliding bay %02d' % (i + 1), (1.35 + 1.10 * i, 11.4, 1.04),
           1.07, 2.20, 0, False, False)
    if i in [2, 4]:
        box('Black sliding-door handle', (.45, -.08, -.14), (.03, .05, .24), black)
for x, angle in [(.8, -90), (7.4, 90)]:
    for j in range(3):
        window('Sunroom side sliding bay', (x, 8.68 + 1.08 * j, 1.04), 1.045, 2.20,
               angle, False, False)

collection('06 | Sunroom furniture')
asset('Wooden indoor climbing gym', (2.8, 9.85, -.08), 0, '1,2,5')
# A-frame: two sloping ladders, horizontal monkey bars, rope grid,
# clean swing and colorful hold panel. No scattered toys.
for x in [-.98, .98]:
    for side in [-1, 1]:
        rod('Splayed timber leg', (x, side * .86, .04), (x, side * .57, 1.80), .042, pine)
    for j in range(6):
        z = .22 + j * .27
        y = .86 - z / 1.8 * .29
        rod('Ladder rung', (x, -y, z), (x, y, z), .024, pine)
    box('Ground runner', (x, 0, .045), (.12, 1.92, .09), pine)
for y in [-.58, .58]:
    box('Monkey bar side rail', (0, y, 1.80), (2.08, .11, .16), pine)
for i in range(8):
    rod('Overhead monkey bar', (-.9 + i * .257, -.58, 1.80), (-.9 + i * .257, .58, 1.80), .024, pine)
board = box('Plywood climbing wall', (.57, -.69, .91), (.67, .055, 1.47), pine)
for i in range(9):
    x = .38 + (i % 2) * .35
    z = .29 + i * .145
    hold = sphere('Sculpted climbing hold', (x, -.735, z), (.077, .047, .052), holds[i % 4])
    hold.rotation_euler.y = (i % 3) * .6
    sphere('Hold bolt recess', (x, -.779, z), (.01, .006, .01), black)
rope = material('Cotton climbing rope', (.81, .78, .66), .95)
for i in range(5):
    x = -.89 + i * .20
    rod('Rope grid vertical', (x, .63, .16), (x, .63, 1.73), .012, rope)
for i in range(7):
    z = .18 + i * .25
    rod('Rope grid horizontal', (-.89, .63, z), (-.09, .63, z), .012, rope)
    for j in range(5):
        sphere('Rope knot', (-.89 + j * .2, .63, z), (.018, .018, .018), rope)
box('Hanging wooden swing seat', (-.35, -.05, .42), (.62, .30, .04), pine)
for x in [-.62, -.08]:
    for y in [-.14, .04]:
        rod('Swing rope', (x, y, .44), (x, y, 1.8), .008, rope)

sofa('Wicker sunroom loveseat', (6.77, 9.00, -.08), 1.65, bluegrey, -90, '3,5', True)
sofa('Wicker sunroom armchair', (6.80, 10.57, -.08), .88, bluegrey, -90, '3,5', True)
table('Wicker side table', (5.83, 10.72, -.08), (.58, .56, .49), wicker, photos='5')
lamp('Two-cup adjustable sunroom floor lamp', (7.07, 11.0, -.08), 1.68, photos='3,5', double=True)
asset('Arched wicker etagere', (5.83, 8.42, -.08), 180, '4')
for x in [-.31, .31]:
    rod('Etagere upright', (x, .13, 0), (x, .13, 1.43), .025, wicker)
curve('Arched crown', [(.31 * math.cos(t * math.pi / 32), .13, 1.43 + .31 * math.sin(t * math.pi / 32))
                       for t in range(33)], .025, wicker)
for z in [.12, .53, .96, 1.35]:
    box('Empty wicker shelf', (0, 0, z), (.61, .35, .04), wicker)
for i in range(17):
    x = -.28 + i * .035
    rod('Wicker backing', (x, .16, .1), (x, .16, 1.43 + math.sqrt(max(0, .31 ** 2 - x ** 2))), .005, rattan)
# Large plastic playhouse is permanent play furniture in the references.
asset('Small sunroom playhouse', (1.38, 8.65, -.08), 0, '1,5')
playwall = material('Playhouse warm beige plastic', (.68, .61, .44), .6)
roofgreen = material('Playhouse dark green roof', (.014, .17, .13), .42)
box('Playhouse left wall', (-.40, 0, .50), (.075, .85, 1), playwall)
box('Playhouse right wall', (.40, 0, .50), (.075, .85, 1), playwall)
for x in [-.33, .33]:
    box('Playhouse doorway jamb', (x, -.425, .46), (.19, .06, .92), playwall)
box('Playhouse door lintel', (0, -.425, .95), (.8, .07, .16), playwall)
box('Playhouse back wall', (0, .425, .48), (.8, .06, .96), playwall)
for side in [-1, 1]:
    obj = box('Green pitched roof', (side * .235, 0, 1.13), (.59, 1.02, .07), roofgreen)
    obj.rotation_euler.y = side * math.radians(31)
    for j in range(7):
        rod('Raised roof seam', (side * .02, -.43 + j * .14, 1.29),
            (side * .48, -.43 + j * .14, 1.02), .012, roofgreen)

collection('07 | Kitchen floor and backsplash')
asset('Grey and ivory patterned kitchen tiles', photos='6')
box('Tile grout bed', (6.17, 6.38, .013), (3.23, 3.22, .022), grout, 0)
for ix in range(9):
    for iy in range(9):
        x, y = 4.74 + ix * .357, 4.95 + iy * .357
        box('Ivory square tile', (x, y, .028), (.351, .351, .012), tilewhite, .003)
        # Procedural quatrefoil ornament, modeled in curves on the tile.
        pts = []
        for k in range(65):
            t = k * math.tau / 64
            r = .092 + .027 * math.cos(4 * t)
            pts.append((x + r * math.cos(t), y + r * math.sin(t), .036))
        curve('Grey quatrefoil tile motif', pts, .009, tilegrey, True)
        for dx, dy in [(-.13, -.13), (.13, -.13), (-.13, .13), (.13, .13)]:
            obj = box('Tile corner diamond', (x + dx, y + dy, .036), (.033, .033, .003), tilegrey, .002)
            obj.rotation_euler.z = math.pi / 4
asset('White subway tile backsplash', photos='6')
for row in range(7):
    for i in range(17):
        x = 4.57 + .195 * i + (row % 2) * .095
        if x < 7.05:  # W3: backsplash stops before the garage door.
            box('Rear subway tile', (x, 7.945, 1.0 + row * .087), (.189, .018, .081), tilewhite, .005)
    for i in range(10):
        y = 6.00 + .195 * i + (row % 2) * .095
        if y < 7.9:
            box('Return subway tile', (4.57, y, 1.0 + row * .087), (.018, .189, .081), tilewhite, .005)

collection('08 | Kitchen cabinetry and appliances')


def cabinet(name, pos, width, angle=0, upper=False, glassfront=False, top=True, height=None):
    asset(name, pos, angle, '6')
    h, depth = (.76, .34) if upper else (.86, .60)
    h = height or h
    if glassfront or (not upper and not top):
        for x in [-width / 2 + .018, width / 2 - .018]:
            box('White cabinet side', (x, 0, h / 2), (.035, depth, h), white)
        for z in ([.018, h - .018] if upper or top else [.018]):
            box('White cabinet horizontal', (0, 0, z), (width, depth, .035), white)
        box('Cabinet back', (0, depth / 2 - .01, h / 2), (width, .02, h), white)
    else:
        box('White cabinet carcass', (0, 0, h / 2), (width, depth, h), white)
    if not upper:
        box('Recessed toe kick', (0, -.20, .045), (width - .03, .30, .09), black)
        if top:
            box('Stone counter', (0, -.016, .89), (width + .025, .64, .045), counter)
    count = 2 if width > .75 else 1
    for i in range(count):
        w = (width - .035) / count
        x = -width / 2 + .0175 + (i + .5) * w
        z, dh = (h / 2, h - .04) if upper else (.40, .62)
        if glassfront:
            frame('Glass cabinet door', (x, -depth / 2 - .023, z), w - .065, dh - .06, white, glass)
        else:
            panel('Raised white cabinet door', x, -depth / 2 - .02, z, w - .014, dh)
            # Arched top molding captures the old raised-panel door style.
            pts = [(x - w * .32, -depth / 2 - .06, z - dh * .30),
                   (x - w * .32, -depth / 2 - .06, z + dh * .20)]
            pts += [(x - w * .32 * math.cos(t * math.pi / 16), -depth / 2 - .06,
                     z + dh * .20 + .075 * math.sin(t * math.pi / 16)) for t in range(17)]
            pts.append((x + w * .32, -depth / 2 - .06, z - dh * .30))
            curve('Arched panel molding', pts, .008, white)
        rod('Brushed door pull', (x + w * .29, -depth / 2 - .085, z - .055),
            (x + w * .29, -depth / 2 - .085, z + .055), .009, steel)
    if not upper:
        panel('Top drawer', 0, -.32, .76, width - .035, .14)
        rod('Drawer handle', (-.09, -.38, .76), (.09, -.38, .76), .009, steel)


cabinet('Kitchen rear corner base', (4.89, 7.61, .035), .60)
cabinet('Kitchen sink base', (5.84, 7.61, .035), 1.21, top=False)
cabinet('Kitchen return base', (4.88, 7.14, .035), .78, 90, top=False)
asset('Kitchen return counter with butt joint', photos='6')
box('Non-overlapping return counter', (4.896, 7.006, .925), (.64, .536, .045), counter)
cabinet('Kitchen upper corner', (4.89, 7.78, 1.55), .60, upper=True)
cabinet('Kitchen upper over sink', (5.84, 7.78, 1.68), 1.05, upper=True)
cabinet('Kitchen glass cupboard', (6.82, 7.78, 1.55), .64, upper=True, glassfront=True)
cabinet('Kitchen return upper', (4.74, 7.1, 1.56), .80, 90, True)

asset('Double basin sink and gooseneck faucet', (5.84, 7.58, .035), 0, '6,W3')
for y in [-.28, .25]:
    box('Counter around sink front back', (0, y, .89), (1.23, .12, .045), counter)
for x in [-.56, .56]:
    box('Counter around sink side', (x, -.015, .89), (.12, .42, .045), counter)
for cx in [-.245, .245]:
    box('Sink basin bottom', (cx, -.01, .74), (.43, .35, .018), steel, .04)
    for x in [cx - .22, cx + .22]:
        box('Sink basin side', (x, -.01, .815), (.017, .37, .16), steel, .006)
    for y in [-.20, .18]:
        box('Sink basin end', (cx, y, .815), (.45, .017, .16), steel, .006)
    cylinder('Drain', (cx, -.01, .753), .025, .005, black)
pts = [(0, .25, .9), (0, .25, 1.15)]
pts += [(0, .12 + .13 * math.cos(i * math.pi / 24), 1.15 + .13 * math.sin(i * math.pi / 24)) for i in range(25)]
pts += [(0, -.01, 1.09)]
curve('Curved stainless faucet', pts, .014, steel)
rod('Mixer lever', (.09, .25, .91), (.09, .21, 1.04), .008, steel)

asset('Stainless dishwasher', (6.82, 7.61, .035), 0, '6,W3')
box('Dishwasher body', (0, 0, .42), (.65, .60, .84), black)
box('Stainless dishwasher front', (0, -.32, .44), (.625, .045, .76), steel, .018)
box('Dishwasher top control strip', (0, -.35, .79), (.60, .015, .045), screen)
rod('Dishwasher bar handle', (-.25, -.39, .73), (.25, -.39, .73), .016, steel)
box('Counter above dishwasher', (0, -.016, .89), (.675, .64, .045), counter)

asset('Stainless range and oven', (4.91, 6.29, .035), 90, '6')
box('Range casing', (0, 0, .43), (.78, .64, .86), steel)
box('Black ceramic cooktop', (0, 0, .877), (.77, .63, .025), screen)
for x in [-.21, .21]:
    for y in [-.18, .16]:
        cylinder('Burner ring', (x, y, .893), .125, .008, steel)
        cylinder('Burner center', (x, y, .899), .106, .008, black)
box('Oven glass window', (0, -.328, .42), (.60, .02, .43), screen, .04)
rod('Oven door handle', (-.30, -.40, .69), (.30, -.40, .69), .021, steel)
for x in [-.28, -.14, .14, .28]:
    cylinder('Range control knob', (x, -.354, .80), .029, .032, black).rotation_euler.x = math.pi / 2
box('Range control display', (0, -.358, .80), (.1, .01, .044), screen)
asset('Over-range microwave', (4.78, 6.29, 1.50), 90, '6')
box('Microwave body', (0, 0, .20), (.78, .43, .40), steel)
box('Microwave glass door', (-.045, -.224, .21), (.61, .018, .29), screen)
rod('Microwave vertical handle', (.21, -.26, .12), (.21, -.26, .31), .014, steel)
cabinet('Upper cupboard above microwave', (4.75, 6.29, 1.92), .80, 90, True, height=.52)

asset('French-door refrigerator', (4.99, 5.32, .035), 90, '6')
box('Refrigerator cabinet', (0, 0, .94), (.91, .77, 1.88), steel, .045)
for x in [-.229, .229]:
    box('French door', (x, -.409, 1.20), (.447, .08, 1.30), steel, .025)
    rod('Curved vertical fridge handle', (x * .26, -.505, .88), (x * .26, -.505, 1.72), .018, steel)
box('Bottom freezer drawer', (0, -.409, .30), (.90, .08, .53), steel, .025)
rod('Freezer drawer handle', (-.34, -.505, .48), (.34, -.505, .48), .023, steel)
box('Water dispenser recess', (-.23, -.455, 1.20), (.22, .012, .28), screen)
box('Water dispenser shelf', (-.23, -.49, 1.075), (.22, .08, .014), steel)

# A small amount of orderly tableware behind the glass cupboard doors.
asset('Stored kitchen tableware', (6.82, 7.77, 1.55), 0, '6,W3')
ROOT.scale.x=.60
for z in [.22, .48]:
    box('Cupboard interior shelf', (0, 0, z), (1.0, .30, .02), oak)
    for i in range(5):
        cylinder('Neatly stored glass tumbler', (-.38 + i * .18, -.035, z + .07), .044, .12, glass)

collection('09 | Living room furniture')
sofa('Main oatmeal three-seat sofa', (.55, 2.55, .018), 2.25, linen, 90, '8')
sofa('Child-sized blue sofa', (2.35, .52, .018), 1.42, navy, 180, '7,8')
# Photos 8 and V3 show low foam seating beneath the window sill.
# Keep its observed footprint, but do not give it an adult sofa's height.
ROOT.scale.z = .52
ROOT['confidence'] = 'low child seating observed; dimensions estimated'
sofa('Living upholstered armchair', (2.85, 3.00, .018), .95, linen, 0, '8')
table('White tray activity table', (1.82, 2.30, .018), (1.36, .82, .49), white, 90, '8')
for x in [-.66, .66]:
    box('Raised tray side', (x, 0, .55), (.028, .82, .14), white)
for y in [-.4, .4]:
    box('Raised tray end', (0, y, .55), (1.34, .028, .14), white)
table('Small light wood side table', (3.60, .50, .018), (.61, .59, .55), pine, photos='7,8')
table('Living computer desk', (.34, .66, .018), (.85, .56, .74), walnut, 90, 'House Tour 51.008s')
asset('Living computer monitor', (.33, .66, .018), 90, 'House Tour 51.008s')
box('Monitor base', (0, 0, .78), (.26, .18, .025), black)
rod('Monitor pedestal', (0, .02, .78), (0, .02, .92), .020, black)
box('Monitor frame', (0, .02, 1.05), (.61, .055, .37), black)
box('Monitor screen', (0, -.013, 1.05), (.57, .008, .33), screen)
box('Compact keyboard', (0, -.17, .774), (.40, .13, .02), black)
asset('Living computer chair', (1.02,.65,.018), -90, 'House Tour 51.008s')
box('Computer chair white seat',(0,0,.46),(.44,.44,.045),white,.035)
for x in [-.20,.20]:
    rod('Computer chair front leg',(x,-.18,.02),(x,-.18,.45),.013,white)
    rod('Computer chair rear frame',(x,.18,.02),(x,.18,.89),.013,white)
for z in [.64,.76,.88]:rod('Computer chair back rail',(-.2,.18,z),(.2,.18,z),.014,white)
lamp('Living table lamp', (.25, 1.04, .76), .61, photos='House Tour 51.008s')
lamp('Brass living floor lamp', (3.58, 3.10, .018), 1.69, photos='7,8')
asset('Large framed living room mirror', (.065, 2.55, 1.78), 90, '8')
frame('Dark beveled mirror frame', (0, 0, 0), 1.44, .93, walnut)
frame('Inner brass mirror bead', (0, -.043, 0), 1.31, .80, brass)
asset('Upright wood piano', (2.35, 4.09, .018), 0, '8', 'partially visible; instrument form inferred')
box('Piano lower cabinet', (0, .03, .43), (1.44, .50, .83), walnut)
box('Piano upper cabinet', (0, .14, 1.03), (1.47, .30, .47), oak)
box('Piano top', (0, .12, 1.29), (1.53, .40, .055), walnut)
box('Keyboard bed', (0, -.26, .76), (1.42, .29, .07), walnut)
for i in range(36):
    x = -.67 + i * .0372
    box('Ivory piano key', (x, -.30, .813), (.0355, .22, .025), tilewhite, .002)
    if i % 7 in [0, 1, 3, 4, 5] and i < 35:
        box('Black piano key', (x + .018, -.25, .837), (.019, .115, .03), black, .002)
for x in [-.58, .58]:
    box('Piano front leg', (x, -.28, .37), (.065, .065, .74), walnut)
for x in [-.07, 0, .07]:
    box('Brass pedal', (x, -.31, .10), (.036, .14, .028), brass)
table('Piano bench', (2.15, 3.62, .018), (.80, .34, .50), walnut, 0, '8')
# This provisional piano supplies the lower-room furniture copy below. The
# video resolves the living-room pieces as a cupboard and a separate TV unit.
asset('Tall living two-door wood cupboard', (.34,3.96,.018),90,'House Tour 51.008s',
      'two doors and position on mirror wall observed; dimensions estimated')
box('Cupboard carcass',(0,0,.99),(.82,.58,1.98),walnut)
box('Cupboard crown',(0,0,2.02),(.88,.63,.065),oak)
for x in [-.205,.205]:
    panel('Cupboard raised door',x,-.31,1.03,.397,1.77,oak)
    sphere('Cupboard brass handle',(x*.20,-.365,1.02),(.019,.018,.025),brass)
chest('Living television media cabinet',(2.25,4.08,.018),1.72,.64,0,2,3,'House Tour 54.010s')
asset('Living large television',(2.25,4.08,.018),0,'House Tour 54.010s')
box('Large TV bezel',(0,0,1.12),(1.47,.075,.85),black,.018)
box('Large TV dark screen',(0,-.043,1.12),(1.42,.009,.80),screen,.01)
for x in [-.50,.50]:rod('TV angled foot',(x,0,.75),(x+.09,-.15,.65),.013,black)
asset('Living dollhouse shelf',(.93,4.03,.018),0,'House Tour 54.010s')
for x in [-.37,.37]:box('Dollhouse side',(x,0,.55),(.035,.40,1.10),white)
for z in [.05,.42,.78,1.11]:box('Dollhouse shelf',(0,0,z),(.77,.42,.03),white)
box('Dollhouse back',(0,.20,.58),(.76,.025,1.13),cream)

# Permanent baby furniture is retained; loose toys, clothing, food and people
# are deliberately absent from this clean architectural study.
asset('Living baby swing', (1.10, .78, .018), -20, '8')
for x in [-.34, .34]:
    curve('White swing A-frame', [(x, -.40, .03), (x, -.34, .05), (x, .03, 1.07),
                                  (x, .12, 1.11), (x, .45, .03)], .018, white)
rod('Swing overhead bridge', (-.34, .08, 1.08), (.34, .08, 1.08), .022, white)
for x in [-.24, .24]:
    rod('Swing suspension', (x, .08, 1.07), (x, -.02, .45), .013, steel)
sphere('Padded baby seat', (0, -.02, .39), (.30, .37, .12), bluegrey)
back = sphere('Reclined baby seat back', (0, .20, .53), (.29, .11, .29), bluegrey)
back.rotation_euler.x = math.radians(-25)

collection('10 | Dining and entry furniture')
table('Dark wood dining table', (5.52, 6.38, .018), (1.90, 1.02, .77), walnut)
box('Table leaf seam', (0, 0, .772), (.005, 1.0, .003), black, 0)


def chair(name, pos, angle=0):
    asset(name, pos, angle, '6,7', 'dining seating partly obscured; estimated chair design')
    box('Chair seat', (0, 0, .46), (.43, .43, .065), walnut, .025)
    for x in [-.17, .17]:
        for y in [-.17, .17]:
            box('Chair leg', (x, y, .22), (.045, .045, .44), walnut)
        rod('Chair back upright', (x, .17, .45), (x, .17, .98), .023, walnut)
    for z in [.64, .80, .95]:
        box('Chair back slat', (0, .17, z), (.39, .04, .065), walnut)


for x in [5.05, 5.98]:
    chair('Dining chair rear', (x, 7.13, .018))
    chair('Dining chair front', (x, 5.63, .018), 180)
chest('Multi-drawer dining storage cabinet', (7.52, 6.20, .018), 1.80, 1.25, -90, 5, 4, '7')
chest('Entry tall chest of drawers', (4.45, .32, .018), .70, 1.22, 180, 5, 1, '7')
asset('Dining playpen', (4.05, 4.62, .018), 90, '6,7')
meshmat = material('Playpen translucent mesh', (.65, .65, .57), .9)
bs = meshmat.node_tree.nodes['Principled BSDF']
bs.inputs['Alpha'].default_value = .16
box('Playpen padded floor', (0, 0, .15), (.93, .65, .07), linen)
for x in [-.48, .48]:
    for y in [-.34, .34]:
        rod('Playpen corner post', (x, y, .03), (x, y, .78), .032, black)
for y in [-.34, .34]:
    box('Mesh playpen side', (0, y, .44), (.93, .006, .58), meshmat, 0)
    rod('Playpen top rail', (-.48, y, .77), (.48, y, .77), .034, linen)
for x in [-.48, .48]:
    box('Mesh playpen end', (x, 0, .44), (.006, .65, .58), meshmat, 0)
    rod('Playpen end rail', (x, -.34, .77), (x, .34, .77), .034, linen)
asset('Gallery wall frame group', (3.465, 4.72, 0), 90, '6,7,8')
artcolors = [material('Abstract art muted ' + str(i), c) for i, c in enumerate([
    (.22, .32, .37), (.57, .41, .27), (.41, .49, .36)])]
for i, (x, z, w, h) in enumerate([(-.27, 1.95, .33, .43), (.24, 1.94, .39, .35),
                                 (.13, 1.34, .32, .43), (-.27, .85, .32, .36)]):
    frame('Simplified framed wall art', (x, 0, z), w, h, pine, artcolors[i % 3])
box('Thermostat', (-.25, -.05, 1.36), (.12, .045, .12), screen)

collection('11 | Split-level stairs and iron rails')
asset('Parallel split-level stair bay', photos='7,9,10', confidence='stair pairing observed; 7 risers and levels estimated')
for i in range(7):
    # Up from the main dining approach toward the front of the house.
    y, z = 4.5 - (i + .5) * .28, (i + 1) * .18
    # W9 reveals the basement return below this flight. Keep the upper stair
    # structure shallow instead of filling the entire volume down to Z=0.
    box('Upper stair white riser block', (.59, y, z - .10), (1.16, .28, .20), white, .003)
    box('Upper stair carpet tread', (.59, y - .006, z + .008), (1.16, .29, .027), carpet, .012)
    box('Upper stair carpet riser', (.59, y + .143, z - .084), (1.16, .013, .17), carpet, .003)
for i in range(7):
    y, z = 4.50 - (i + .5) * .27, -(i + 1) * .15
    height = z + 1.21
    box('Lower stair riser block', (1.98, y, -1.21 + height / 2), (1.20, .27, height), white, .003)
    box('Lower stair carpet tread', (1.98, y, z + .008), (1.20, .283, .025), carpet, .01)
    box('Lower stair carpet riser', (1.98, y + .14, z - .065), (1.20, .014, .145), carpet, .003)
box('Upper landing', (.59, 1.92, 1.18), (1.18, 1.23, .16), white)
box('Upper landing oak floor', (.59, 1.92, 1.273), (1.18, 1.23, .026), oak)


def railing(name, x, y0, y1, z0, z1):
    rod(name + ' handrail', (x, y0, z0 + .90), (x, y1, z1 + .90), .024, black)
    rod(name + ' lower rail', (x, y0, z0 + .16), (x, y1, z1 + .16), .014, black)
    for i in range(12):
        t = i / 11
        y = y0 + (y1 - y0) * t
        z = z0 + (z1 - z0) * t
        box(name + ' baluster', (x, y, z + .50), (.018, .018, .76), black, .003)
        if i % 2:
            # Four-sided twisted central iron detail.
            curve(name + ' twisted spindle', [(x + .013 * math.cos(t2 * math.tau / 16),
                  y + .013 * math.sin(t2 * math.tau / 16), z + .32 + t2 * .016)
                  for t2 in range(17)], .006, black)


for x in [.025, 1.17]:
    railing('Upper black iron', x, 4.40, 2.57, .18, 1.26)
for x in [1.40, 2.56]:
    railing('Lower black iron', x, 4.47, 2.65, 0, -1.05)
asset('White upper stair safety gate', (.59, 2.50, 1.28), 0, '9')
for x in [-.51, .51]:
    box('Gate upright', (x, 0, .40), (.045, .045, .80), white)
for z in [.06, .76]:
    box('Gate horizontal rail', (0, 0, z), (1.05, .04, .04), white)
for i in range(10):
    rod('Gate vertical bar', (-.46 + i * .102, 0, .07), (-.46 + i * .102, 0, .75), .009, white)
asset('Upper landing walls and door', photos='9,U1,U10', confidence='hall continues straight; green bathroom left, homeowner confirmed')
wallbox('Landing left wall', (-.06, 1.93, 2.38), (.12, 1.3, 2.24))
wallbox('Landing right wall', (1.23, 1.93, 2.38), (.12, 1.3, 2.24))
wallbox('Landing rear header', (.59, 1.30, 3.32), (1.3, .12, .34))
# This was provisionally closed in the first pass; the new hall photos establish
# an open connection continuing straight from the landing.

collection('12 | Lower family room architecture')
asset('Lower family room walls', photos='10', confidence='visible finishes; inferred room extent')
wallbox('Fireplace wall', (1.0, -3.77, .055), (4.74, .14, 2.21))
wallbox('Family west wall', (-1.37, -1.2, .055), (.14, 5, 2.21))
wallbox('Family east wall below windows', (3.37, -1.2, -.71), (.14, 5, .68))
wallbox('Family east wall above windows', (3.37, -1.2, 1.115), (.14, 5, .11))
for y, d in [(-3.47, .60), (-1.2, .20), (1.0, .60)]:
    wallbox('Family window pier', (3.37, y, .36), (.14, d, 1.46))
# Wood wainscot and cap, visible behind the fireplace.
for i in range(24):
    box('Vertical timber wainscot', (-1.25 + i * .196, -3.676, -.59), (.19, .025, .91), oak, .002)
box('Wainscot cap', (1, -3.65, -.12), (4.65, .07, .06), walnut)
window('Lower room side window A', (3.36, -2.28, .36), 1.85, 1.4, 90, True, True)
window('Lower room side window B', (3.36, -.14, .36), 1.85, 1.4, 90, True, True)
asset('Fireplace with white surround and wood mantel', (1.0, -3.55, -1.04), 180, '10')
box('Chimney breast', (0, .02, .78), (1.90, .22, 1.57), oak)
box('Black firebox opening', (0, -.107, .59), (1.16, .02, 1.11), black)
for x in [-.67, .67]:
    box('White masonry surround leg', (x, -.14, .60), (.18, .08, 1.22), tilewhite)
box('White masonry surround lintel', (0, -.14, 1.18), (1.48, .08, .16), tilewhite)
for i in range(9):
    for x in [-.67, .67]:
        box('Masonry mortar joint', (x, -.183, .08 + .125 * i), (.18, .003, .006), grout, 0)
box('Oak mantel shelf', (0, -.06, 1.48), (2.10, .43, .09), walnut)
box('Fireplace hearth', (0, -.34, .035), (1.74, .61, .07), tilegrey)
for x in [-.52, .52]:
    box('Fire screen brass upright', (x, -.20, .60), (.018, .02, 1.05), brass)
box('Fire screen brass lintel', (0, -.20, 1.12), (1.06, .02, .018), brass)
box('Television over fireplace', (0, .015, 1.82), (1.65, .08, .68), black)
box('Television display', (0, -.03, 1.82), (1.58, .012, .61), screen)

collection('13 | Lower family room furniture')
sofa('Lower blue sofa', (2.83, -1.92, -1.025), 1.91, bluegrey, -90, '9,10')
sofa('Lower olive lounge chair', (2.61, .17, -1.025), 1.04, green, -90, '9,10')
sofa('Lower dark recliner', (.06, -1.66, -1.025), .86, black, -70, '10')
table('Lower dark wood coffee table', (1.03, -1.49, -1.025), (.91, .61, .47), walnut, photos='10')
asset('Lower cubby storage', (2.50, -3.38, -1.025), 180, '10')
for x in [-.53, 0, .53]:
    box('Cubby upright', (x, 0, 1.01), (.05, .35, 2.02), walnut)
for z in [.04, .52, 1.0, 1.48, 1.99]:
    box('Cubby shelf', (0, 0, z), (1.11, .35, .045), walnut)
box('Cubby backing', (0, .16, 1.01), (1.08, .03, 2.02), walnut)
for x, z, mat in [(-.26, .29, green), (.26, .29, navy), (-.26, .77, linen), (.26, 1.25, bluegrey)]:
    box('Neatly stored fabric bin', (x, -.016, z), (.43, .28, .40), mat, .025)
    box('Bin inset pull', (x, -.163, z + .05), (.12, .008, .035), black)
chest('Lower shallow storage drawers', (-1.1, -2.08, -1.025), 1.46, 1.3, 90, 6, 2, '9,10')
asset('Lower ceiling fan', (1.0, -1.25, 1.10), 0, '10')
rod('Ceiling fan downrod', (0, 0, 0), (0, 0, -.23), .025, black)
cylinder('Fan motor', (0, 0, -.24), .14, .15, black)
for i in range(4):
    a = i * math.pi / 2
    obj = box('Fan blade', (.38 * math.cos(a), .38 * math.sin(a), -.22), (.65, .12, .025), walnut)
    obj.rotation_euler.z = a
cylinder('Fan light diffuser', (0, 0, -.34), .12, .075, shade)

# The lower room sits beside the main floor, never through its floor slab.
for cname in ['12 | Lower family room architecture', '13 | Lower family room furniture']:
    for obj in bpy.data.collections[cname].objects:
        if obj.parent is None:
            obj.location.x -= .7

# Place the lower room's window/seating wall on the exterior side, as seen
# to the right when descending in Photo 10. Pair the stair flights so the
# upstairs run is on the left when approached, as in Photos 9 and 10.
bpy.context.view_layer.update()
for cnames, axis in [(['12 | Lower family room architecture', '13 | Lower family room furniture'], .3),
                      (['11 | Split-level stairs and iron rails'], 1.3)]:
    reflection = Matrix.Translation((axis, 0, 0)) @ Matrix.Diagonal((-1, 1, 1, 1)) @ Matrix.Translation((-axis, 0, 0))
    for cname in cnames:
        for obj in bpy.data.collections[cname].objects:
            if obj.parent is None:
                obj.matrix_world = reflection @ obj.matrix_world

# PHOTO-ANCHORED ROOM ORIENTATION.
# Main front = -Y. In Photo 7, looking toward the entry, the stairs are
# on camera-left (+X) and leave the SIDE of the main room. Photo 8's
# mirror is on X=0, perpendicular to the front window wall Y=0.
# Photo 6 looks across dining into the kitchen: appliances on Y=4.5,
# sink on X=0. Furniture was built in convenient room-local coordinates;
# transform whole room roots once, keeping every part editable.
quarter_turn = Matrix.Rotation(math.pi / 2, 4, 'Z')
room_transforms = [
    (['07 | Kitchen floor and backsplash', '08 | Kitchen cabinetry and appliances'],
     Matrix.Translation((8, -.06, 0)) @ quarter_turn),
    (['11 | Split-level stairs and iron rails'],
     Matrix.Translation((12.3, 2.0, 0)) @ quarter_turn),
    (['12 | Lower family room architecture', '13 | Lower family room furniture'],
     Matrix.Translation((10.99, 2.0, 0)) @ quarter_turn),
]
bpy.context.view_layer.update()
for cnames, transform in room_transforms:
    for cname in cnames:
        for obj in bpy.data.collections[cname].objects:
            if obj.parent is None:
                obj.matrix_world = transform @ obj.matrix_world
obj = bpy.data.objects['Lower family room floor']
obj.matrix_world = Matrix.Translation((10.99, 2.0, 0)) @ quarter_turn @ obj.matrix_world

COLL = bpy.data.collections['11 | Split-level stairs and iron rails']
asset('Lower stair opening white casing', photos='9,10')
for y in [1.99, 3.29]:
    box('Lower doorway upright casing', (7.77, y, 1.06), (.075, .065, 2.12), white)

exec(compile((HERE / 'upstairs.py').read_text(encoding='utf-8'), str(HERE / 'upstairs.py'), 'exec'))
exec(compile((HERE / 'extensions.py').read_text(encoding='utf-8'), str(HERE / 'extensions.py'), 'exec'))
exec(compile((HERE / 'basement_garage.py').read_text(encoding='utf-8'), str(HERE / 'basement_garage.py'), 'exec'))
exec(compile((HERE / 'yard.py').read_text(encoding='utf-8'), str(HERE / 'yard.py'), 'exec'))
exec(compile((HERE / 'exterior.py').read_text(encoding='utf-8'), str(HERE / 'exterior.py'), 'exec'))

ceilings = collection('14 | Ceilings - hidden for dollhouse')
asset('Main level ceilings', confidence='estimated 2.6m ceiling height')
box('Main rectangular ceiling', (3.9, 4, 2.65), (7.95, 8.1, .10), white)
box('Upper stairwell ceiling', (9.40, 4.01, 3.58), (3.3, 1.30, .10), white)
asset('Sloped soffit above descending stairs', photos='9,10', confidence='visible bulkhead; slope estimated')
profile = [(7.78, 2.12), (9.70, 1.16), (9.70, 2.66), (7.78, 2.66)]
mesh = bpy.data.meshes.new('Stair soffit solid wedge')
mesh.from_pydata([(x, y, z) for y in [1.96, 3.32] for x, z in profile], [],
                 [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                  (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
finish(bpy.data.objects.new('Descending stair sloped header', mesh), 'Descending stair sloped header', wall)
asset('Sunroom shallow ceiling panels', photos='1-5')
for i in range(6):
    obj = box('Porch ceiling panel', (1.35 + i * 1.10, 9.75, 2.40), (1.095, 3.40, .07), white)
    obj.rotation_euler.x = math.radians(-2)
box('Lower room ceiling', (12.19, 2.3, 1.20), (5.1, 4.7, .08), white)
asset('Kitchen recessed light trims', photos='6')
for x in [.8, 2.4]:
    for y in [5.2, 7.1]:
        cylinder('Recessed light trim', (x, y, 2.585), .095, .018, steel)
        cylinder('Recessed diffuser', (x, y, 2.572), .078, .009, shade)

collection('15 | Studio lighting and cameras')
area('Large softbox daylight', (4, -1, 11), (6, 4, 0), 2400, 8)
area('Sunroom daylight', (4.0, 12.5, 4.5), (4.1, 9.2, .5), 1000, 5)
area('Front daylight', (11, -4, 6), (10.8, 3, .5), 1500, 6)
area('Kitchen ceiling illumination', (1.6, 6.3, 2.48), (1.6, 6.3, 0), 180, 2.0)
area('Living ceiling fill', (2.2, 2.2, 2.46), (2.2, 2.2, 0), 100, 2.0)
area('Dining ceiling fill', (5.5, 6.2, 2.43), (5.5, 6.2, 0), 100, 2.0)
area('Lower room ceiling fill', (12.29, 2.4, 1.10), (12.29, 2.4, -1), 110, 2.0)
for name, (x0,x1,y0,y1,mat) in UPPER_ROOMS.items():
    center = UPPER_ORIGIN + Vector(((x0+x1)/2, (y0+y1)/2, 2.26))
    area(name+' ceiling fill', center, center-Vector((0,0,2)), 100, min(x1-x0,y1-y0)*.65)
area('Upper hall ceiling light', (13.1,4.01,3.5),(13.1,4.01,1.3),60,1)
area('Lower bedroom ceiling fill',(14.35,6.50,1.1),(14.35,6.50,-1),90,1.4)
area('Lower bathroom ceiling fill',(11.4,7.5,1.1),(11.4,7.5,-1),60,.8)
# Photographic materials, practical lights, sky and render settings.
exec(compile((HERE / 'photoreal.py').read_text(encoding='utf-8'), str(HERE / 'photoreal.py'), 'exec'))

CAMERAS = {}


def camera(name, pos, target, lens=24, ortho=None):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new('Camera | ' + name, data)
    COLL.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data.lens = lens
    data.clip_start = .04
    data.clip_end = 200
    # Phone-camera depth of field: nearly everything sharp, foreground softened.
    data.dof.use_dof = not ortho
    data.dof.focus_distance = (Vector(target) - Vector(pos)).length
    data.dof.aperture_fstop = 8
    if ortho:
        data.type = 'ORTHO'
        data.ortho_scale = ortho
    CAMERAS[name] = obj
    return obj


camera('overview', (30, -28, 32), (5.8, 4.3, .1), ortho=34)
camera('sunroom', (5.18, 8.2, 1.9), (4.15, 10.2, .85), 14)
camera('kitchen', (5.7, 7.74, 1.67), (.70, 5.95, 1.1), 26)
camera('living', (6.70, 1.45, 1.70), (.70, 2.30, 1.05), 24)
camera('family', (9.50, 2.62, .85), (13.75, 2.30, -.05), 23)
camera('stairs', (6.30, 3.20, 1.65), (9.20, 3.35, 1.05), 20)
camera('entry', (6.65, 7.72, 1.68), (5.40, .55, 1.02), 20)
camera('plan', (4.75, 5.5, 24), (4.75, 5.5, 0), ortho=26)
camera('upper_overview',(25,-10,19),(14.3,6.0,1.5),ortho=18)
camera('upper_plan',(14.3,6.0,24),(14.3,6.0,1.26),ortho=18)
camera('hall',(11.06,4.01,2.88),(15.8,4.01,2.30),24)
camera('bathroom',(11.57,4.69,2.88),(10.95,6.9,2.28),17)
camera('nursery',(12.57,3.26,2.91),(13.05,1.12,2.07),18)
camera('bedroom',(15.64,4.01,2.92),(17.80,3.84,2.0),19)
camera('cory_nook',(18.10,2.80,2.90),(15.55,1.02,2.03),24)
camera('primary',(14.90,4.72,2.92),(13.83,7.46,2.11),18)
camera('ensuite',(12.50,8.03,2.80),(9.95,7.72,2.05),18)
camera('porch',(4.78,-.72,1.65),(.52,-1.00,.80),24)
camera('lower_bedroom',(12.42,5.70,.57),(15.40,7.15,-.36),18)
camera('lower_bathroom',(11.42,6.38,.56),(11.40,8.09,-.30),17)
camera('garage',(-.64,7.54,1.67),(-3.65,3.40,.75),18)
camera('garage_rear',(-3.45,4.80,1.67),(-4.0,8.10,1.05),24)
camera('basement_play',(2.20,6.85,-1.55),(2.20,3.20,-2.30),16)
camera('basement_office',(6.50,6.60,-1.62),(2.10,6.65,-2.28),20)
camera('basement_laundry',(4.44,5.43,-1.54),(6.51,7.20,-2.14),17)
camera('basement_plan',(4.7,4,20),(4.7,4,-3),ortho=12.8)
camera('basement_stairs',(11.65,3.79,.52),(8.18,3.36,-.67),18)
camera('pink_bedroom',(10.80,6.20,.56),(8.70,7.12,-.35),17)
camera('lower_entry',(11.50,4.95,.56),(11.50,7.85,.10),15)
camera('kitchen_access',(1.50,7.48,1.65),(-1.00,7.56,1.10),24)
camera('basement_entry',(6.75,4.01,-1.53),(2.5,4.01,-2.20),18)
camera('front_yard',(6.60,-3.42,1.55),(4.30,-12.5,.55),22)
camera('back_yard',(4.65,12.70,1.10),(9.2,22.5,.55),20)
camera('street_front',(0.0,-21.0,1.7),(8.5,-1.0,2.6),18)
camera('rear_elevation',(2.0,21.0,1.7),(10.0,7.0,2.6),21)

# Expose the model from the overview camera without deleting enclosure walls.
for name in ['Family east wall above windows']:
    obj = bpy.data.objects[name]
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    cutaway.objects.link(obj)

plan_labels = collection('16 | Plan labels - plan camera only')
plan_ink = bpy.data.materials.new('Plan labels - unlit ink')
plan_ink.use_nodes = True
plan_ink.node_tree.nodes.clear()
ink_output = plan_ink.node_tree.nodes.new('ShaderNodeOutputMaterial')
ink_emission = plan_ink.node_tree.nodes.new('ShaderNodeEmission')
ink_emission.inputs['Color'].default_value = (.012, .022, .030, 1)
plan_ink.node_tree.links.new(ink_emission.outputs[0], ink_output.inputs['Surface'])
for label, pos in [
    ('SUNROOM', (2.3, 10.0, 4.0)), ('KITCHEN', (.5, 6.5, 4.0)),
    ('DINING', (4.8, 6.6, 4.0)), ('LIVING', (.9, 2.8, 4.0)),
    ('ENTRY', (5.0, .35, 4.0)), ('UP', (8.35, 4.0, 4.0)),
    ('DOWN', (8.05, 2.55, 4.0)), ('LOWER FAMILY', (10.45, 2.2, 4.0)),
    ('WHITE BEDROOM', (12.65, 7.35, 4.0)), ('BATH', (10.90, 7.55, 4.0)),
    ('PINK BEDROOM', (8.00, 8.0, 4.0)), ('ENTRY', (11.0, 5.05, 4.0)),
    ('GARAGE', (-4.50, 4.80, 4.0)),
    ('FRONT OF HOUSE', (5.2, -.70, 4.0)),
]:
    data = bpy.data.curves.new('Plan label ' + label, 'FONT')
    data.body = label
    data.size = .33
    data.extrude = 0
    data.materials.append(plan_ink)
    obj = bpy.data.objects.new('Plan label ' + label, data)
    plan_labels.objects.link(obj)
    obj.location = pos

upper_labels = collection('29 | Upstairs plan labels')
for label,pos in [('GREEN BATH',(-.92,2.1)),('PRIMARY',(1.6,3.2)),('ENSUITE',(0,3.85)),
                  ('NURSERY',(.95,-2.1)),('BEDROOM',(5.1,.3)),('HALL / STRAIGHT FROM STAIRS',(.02,0))]:
    data=bpy.data.curves.new('Upstairs plan label '+label,'FONT')
    data.body=label
    data.size=.22 if label.startswith('HALL') else .28
    data.materials.append(plan_ink)
    obj=bpy.data.objects.new('Upstairs plan label '+label,data)
    upper_labels.objects.link(obj)
    obj.location=UPPER_ORIGIN+Vector((*pos,3))


basement_labels = collection('41 | Basement plan labels')
for label,pos in [('PLAY / BUNKS',(.40,3.2)),('OFFICE',(3.00,6.90)),('LAUNDRY',(4.80,7.60)),
                  ('MECHANICAL',(6.3,5.8)),('STAIRS UP',(7.5,4.1))]:
    data=bpy.data.curves.new('Basement plan label '+label,'FONT')
    data.body=label
    data.size=.24
    data.materials.append(plan_ink)
    obj=bpy.data.objects.new('Basement plan label '+label,data)
    basement_labels.objects.link(obj)
    obj.location=(*pos,.2)


def set_view(name):
    scene.camera = CAMERAS[name]
    upper_view = name in {'upper_overview','upper_plan','hall','bathroom','nursery','bedroom','cory_nook','primary','ensuite'}
    exterior = name in {'overview', 'plan','upper_overview','upper_plan'}
    cutaway.hide_render = exterior
    cutaway.hide_viewport = exterior
    ceilings.hide_render = exterior
    ceilings.hide_viewport = exterior
    plan_labels.hide_render = name != 'plan'
    plan_labels.hide_viewport = name != 'plan'
    upper_labels.hide_render = upper_labels.hide_viewport = name != 'upper_plan'
    elevation = name in {'street_front','rear_elevation'}
    for c in UPPER_COLLECTIONS:
        c.hide_render = c.hide_viewport = not (upper_view or elevation or name in {'overview','stairs'})
    upper_ceilings.hide_render = upper_ceilings.hide_viewport = not (upper_view or name == 'stairs') or exterior
    for c in scene.collection.children:
        if c.name[:2].isdigit() and int(c.name[:2]) <= 13:
            c.hide_render = c.hide_viewport = upper_view
    cutaway.hide_render = cutaway.hide_viewport = exterior or upper_view
    ceilings.hide_render = ceilings.hide_viewport = exterior or upper_view
    for c in EXTENSION_COLLECTIONS:
        c.hide_render = c.hide_viewport = upper_view
    if name == 'plan':
        bpy.data.collections['25 | Front porch and path'].hide_render = True
        bpy.data.collections['25 | Front porch and path'].hide_viewport = True
    extension_ceilings.hide_render = extension_ceilings.hide_viewport = exterior or upper_view
    basement_view = name.startswith('basement_') and name != 'basement_stairs'
    garage_view = name in {'garage','garage_rear'}
    pink_view = name == 'pink_bedroom'
    for c in NEW_COLLECTIONS:
        n=int(c.name[:2])
        visible = ((30 <= n <= 34 and (basement_view or name in {'overview','basement_stairs'})) or
                   (n == 31 and name in {'basement_stairs','plan','family','stairs'}) or
                   (35 <= n <= 37 and (elevation or garage_view or name in {'overview','plan','kitchen','kitchen_access'})) or
                   (n == 38 and (basement_view or garage_view or name in {'overview','basement_stairs','kitchen','kitchen_access'})) or
                   (n in {39,40} and (pink_view or elevation or name in {'overview','plan','family','lower_bedroom','lower_bathroom','lower_entry'})))
        c.hide_render = c.hide_viewport = not visible
    basement_ceiling.hide_render = basement_ceiling.hide_viewport = not (basement_view or name == 'basement_stairs') or name == 'basement_plan'
    stair_soffit=bpy.data.objects['Basement staircase sloped ceiling']
    stair_soffit.hide_render = name in {'basement_plan','plan','overview'}
    stair_soffit.hide_set(stair_soffit.hide_render)
    garage_ceiling.hide_render = garage_ceiling.hide_viewport = name not in {'garage','garage_rear','kitchen','kitchen_access'}
    pink_ceiling.hide_render = pink_ceiling.hide_viewport = not (pink_view or name == 'lower_entry')
    basement_labels.hide_render = basement_labels.hide_viewport = name != 'basement_plan'
    yard_collection.hide_render = yard_collection.hide_viewport = name in {'plan','upper_plan','basement_plan'}
    EXTERIOR.hide_render = EXTERIOR.hide_viewport = exterior or upper_view or basement_view or garage_view or pink_view
    if basement_view or garage_view or pink_view:
        for c in scene.collection.children:
            if c.name[:2].isdigit() and int(c.name[:2]) < 30 and int(c.name[:2]) != 15:
                c.hide_render = c.hide_viewport = True
    if name == 'basement_stairs':
        # See both flights from inside the lower family room.
        ceilings.hide_render = ceilings.hide_viewport = False
    scene.render.resolution_x = 1700 if name == 'overview' else 1440
    scene.render.resolution_y = 1250 if name == 'overview' else 1000
    photoreal_view(name, exterior)


bpy.context.view_layer.update()  # Resolve transforms before hiding room collections.
set_view('overview')
scene['project_status'] = 'WIP photo-based architectural study; not a game'
scene['scale_note'] = 'Metres; room dimensions and unseen connections are estimates, not measured.'
scene['source_photos'] = 'Four private photo sets (1-10, U1-U10, V1-V10, W1-W10) and two private narrated walkthroughs (House Tour, Backyard tour). Timestamped visual observations; dimensions remain estimates. References not packed or committed.'
scene['content_policy'] = 'Furniture retained; loose clutter, people, readable personal items omitted.'
source_files = ['build.py','upstairs.py','extensions.py','basement_garage.py','yard.py','exterior.py','photoreal.py']
scene['generator_sha256'] = hashlib.sha256(b''.join((HERE / name).read_bytes() for name in source_files)).hexdigest()
scene['confirmed_upstairs_orientation'] = 'Hall straight from stairs (+X); green bathroom left (+Y). Primary left, nursery right, end bedroom ahead.'
scene['coordinate_system'] = 'Z up, front -Y, rear +Y, split-level side wing +X. Main 0; porch -.10; family -1.05; upper landing +1.26 m.'

# An embedded guide travels with the native Blender asset.
guide = bpy.data.texts.new('START HERE - House study')
guide.write('HOUSE / PHOTO STUDY / v04\n\n')
guide.write('Editable rooms and furniture from four sets of ten photographs.\n')
guide.write('Dimensions remain estimates. Upper hall continues straight from stairs; green bath left.\n\n')
guide.write('Open the Outliner: collections are grouped by room and type. Furniture has a parent empty.\n')
guide.write('Select a furniture parent and its hierarchy to move an entire piece.\n')
guide.write('Collections 03 and 14 are hidden for the dollhouse: enable viewport AND render to enclose rooms.\n')
guide.write('Named cameras: '+', '.join(CAMERAS)+'.\n')
guide.write('Upper rooms: collections 17-24; toggle 24 for ceilings. Original lower floor: plan camera.\n')
guide.write('Basement: 30-34; garage: 35-37; room lights: 38; pink bedroom: 39-40.\n')
guide.write('Basement stairs return beside the living-room steps (W9). Basement -3.15m is estimated.\n')
guide.write('V8: pink bedroom LEFT, bathroom ahead, white-curtain bedroom RIGHT off the shared entry.\n')
guide.write('Garage is off the kitchen; exact footprint and door offset remain estimates.\n')
guide.write('Run the generator with --views upper_plan or --views nursery to render an isolated upper view.\n')
guide.write('All materials procedural (photoreal.py rebuilds them from photo observations). No external textures or original photos are required.\n')
guide.write('Source: models/house/build.py; provenance and limitations: models/house/README.md.\n')

for screen_data in bpy.data.screens:
    for a in screen_data.areas:
        if a.type == 'VIEW_3D':
            a.spaces.active.region_3d.view_perspective = 'CAMERA'
            a.spaces.active.clip_end = 200
            a.spaces.active.shading.type = 'MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
scene.render.filepath = '//previews/overview.png'
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(HERE / 'house.blend'), compress=True)

manifest = {
    'status': 'work-in-progress; not registered as a game',
    'generator_sha256': scene['generator_sha256'],
    'source_files': source_files,
    'blender_version': bpy.app.version_string,
    'units': 'metres; estimated',
    'objects': len(scene.objects),
    'mesh_objects': sum(o.type == 'MESH' for o in scene.objects),
    'cameras': list(CAMERAS),
    'external_images': [im.filepath for im in bpy.data.images if im.source == 'FILE'],
    'assets': ASSETS,
}
for entry in ASSETS:
    entry['location_m'] = list(bpy.data.objects[entry['name']].location)
(HERE / 'inventory.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('SAVED HOUSE:', manifest['objects'], 'objects;', len(ASSETS), 'editable asset groups', flush=True)
if args.render:
    (HERE / 'previews').mkdir(exist_ok=True)
    for view in args.views.split(','):
        if view not in CAMERAS:
            raise ValueError('Unknown camera: ' + view)
        set_view(view)
        scene.render.filepath = str(HERE / 'previews' / (view + '.png'))
        print('RENDERING:', view, flush=True)
        bpy.ops.render.render(write_still=True)
    set_view('overview')
print('House build complete.', flush=True)
