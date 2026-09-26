"""Fast source-level geometry and moving-prop checks; Blender is not required."""
import ast
import json
import math
from pathlib import Path
import types
import unittest


HERE = Path(__file__).resolve().parent


def source_functions(file, *names):
    """Load the real function bodies without executing Blender's scene setup."""
    tree = ast.parse((HERE / file).read_text(encoding='utf-8'))
    wanted = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    assert len(wanted) == len(names)
    namespace = {'math': math}
    exec(compile(ast.Module(body=wanted, type_ignores=[]), str(HERE / file), 'exec'), namespace)
    return namespace


class RecordingGeo:
    instances = []

    def __init__(self, root, name):
        self.polygons = []
        self.boxes = []
        self.instances.append(self)

    def box(self, position, size, material):
        self.boxes.append((position, size, material))

    def vflat(self, points, y, material):
        self.polygons.append((points, y, material))


class ArtTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ns = source_functions('dressing.py', 'star', 'clip_art_polygon', 'art')
        cls.ns.update(Geo=RecordingGeo, D={key: key for key in (
            'paper', 'wood', 'teal', 'mustard', 'coral', 'ink', 'corn', 'rose')})

    def test_every_motif_stays_on_paper_at_used_and_extreme_aspects(self):
        motifs = ('sun_house', 'rainbow', 'flower', 'pet', 'heart', 'whale',
                  'castle', 'moon', 'landscape', 'pets3', 'abstract', 'grid',
                  'duck', 'dress', 'pixel')
        for motif in motifs:
            for width, height in ((.60, .45), (.21, .28), (.15, .20), (.20, .15),
                                  (1.0, .20), (.20, 1.0)):
                with self.subTest(motif=motif, width=width, height=height):
                    target = types.SimpleNamespace(root=None, name='test', merge=lambda *a: None)
                    self.ns['art'](target, .37, -.21, width, height, motif, frame=False)
                    polygons = RecordingGeo.instances[-1].polygons
                    self.assertGreater(len(polygons), 0)
                    for points, _, _ in polygons:
                        self.assertGreaterEqual(len(points), 3)
                        area = abs(sum(x * points[(i + 1) % len(points)][1] -
                                       points[(i + 1) % len(points)][0] * z
                                       for i, (x, z) in enumerate(points))) / 2
                        self.assertGreater(area, 1e-12)
                        for i, point in enumerate(points):
                            following = points[(i + 1) % len(points)]
                            self.assertGreater(math.dist(point, following), 1e-10)
                        for x, z in points:
                            self.assertGreaterEqual(x, .37 - width / 2 - 1e-10)
                            self.assertLessEqual(x, .37 + width / 2 + 1e-10)
                            self.assertGreaterEqual(z, -.21 - height / 2 - 1e-10)
                            self.assertLessEqual(z, -.21 + height / 2 + 1e-10)
                    depths = [y for _, y, _ in polygons]
                    self.assertGreaterEqual(min(depths), -.010 - 1e-10)
                    self.assertLessEqual(max(depths), -.0065 + 1e-10)

    def test_intersection_on_existing_boundary_vertex_is_unique(self):
        clipped = self.ns['clip_art_polygon'](
            [(-.2, -.1), (.15, -.225), (.5, -.4), (.4, .1)], -.3, .3, -.225, .225)
        self.assertGreaterEqual(len(clipped), 3)
        self.assertEqual(sum(math.dist(p, (.15, -.225)) < 1e-10 for p in clipped), 1)
        self.assertTrue(all(math.dist(p, clipped[(i + 1) % len(clipped)]) > 1e-10
                            for i, p in enumerate(clipped)))
        self.assertEqual(self.ns['clip_art_polygon'](
            [(-1, 0), (-.5, .1), (-.5, -.1)], -.3, .3, -.225, .225), [])
        self.assertEqual(self.ns['clip_art_polygon'](
            [(-1, 0), (-.3, .1), (-.3, -.1)], -.3, .3, -.225, .225), [])

    def test_landscape_hills_are_trimmed_and_remain_visible(self):
        target = types.SimpleNamespace(root=None, name='test', merge=lambda *a: None)
        self.ns['art'](target, 0, 0, .60, .45, 'landscape', frame=False)
        hills = [points for points, _, material in RecordingGeo.instances[-1].polygons
                 if material == 'teal']
        self.assertEqual(len(hills), 2)
        self.assertTrue(all(any(abs(z + .225) < 1e-10 for _, z in hill) for hill in hills))
        self.assertTrue(all(any(z > -.20 for _, z in hill) for hill in hills))

    def test_rainbow_segments_keep_one_depth_per_band(self):
        target = types.SimpleNamespace(root=None, name='test', merge=lambda *a: None)
        self.ns['art'](target, 0, 0, .54, .44, 'rainbow', frame=False)
        bands = RecordingGeo.instances[-1].polygons[:60]
        self.assertEqual(len(bands), 60)
        self.assertEqual(len({y for _, y, _ in bands}), 5)

    def test_entry_chest_picture_faces_with_its_host_chest(self):
        dressing = ast.parse((HERE / 'dressing.py').read_text(encoding='utf-8'))
        build = ast.parse((HERE / 'build.py').read_text(encoding='utf-8'))
        def named_call(tree, function, name):
            return next(node for node in ast.walk(tree) if isinstance(node, ast.Call)
                        and isinstance(node.func, ast.Name) and node.func.id == function
                        and node.args and isinstance(node.args[0], ast.Constant)
                        and node.args[0].value == name)
        host = named_call(build, 'chest', 'Entry tall chest of drawers')
        picture = named_call(dressing, 'prop', 'Entry chest top bowl plant and pet picture')
        host_angle = ast.literal_eval(host.args[4])
        picture_angle = ast.literal_eval(picture.args[4]) if len(picture.args) > 4 else 0
        self.assertEqual(picture_angle, host_angle)
        self.assertEqual(picture_angle, 180)  # local -Y paper front faces the entry room


class FridgeTests(unittest.TestCase):
    def test_fridge_papers_and_magnets_clear_dispenser_and_stay_on_doors(self):
        dressing = ast.parse((HERE / 'dressing.py').read_text(encoding='utf-8'))
        layout = next(node for node in ast.walk(dressing) if isinstance(node, ast.For)
                      and isinstance(node.target, ast.Tuple)
                      and [item.id for item in node.target.elts] == ['x', 'z', 'motif']
                      and any(isinstance(call, ast.Call) and isinstance(call.func, ast.Name)
                              and call.func.id == 'wall_prop' and call.args
                              and isinstance(call.args[0], ast.BinOp)
                              and isinstance(call.args[0].left, ast.Constant)
                              and call.args[0].left.value == 'Kitchen fridge drawing '
                              for child in node.body for call in ast.walk(child)))
        drawings = ast.literal_eval(layout.iter)
        art_call = next(call for child in layout.body for call in ast.walk(child)
                        if isinstance(call, ast.Call) and isinstance(call.func, ast.Name)
                        and call.func.id == 'art')
        width, height = (ast.literal_eval(art_call.args[i]) for i in (3, 4))
        tilt_call = next(call for call in ast.walk(art_call) if isinstance(call, ast.Call)
                         and isinstance(call.func, ast.Attribute) and call.func.attr == 'uniform')
        tilt = max(abs(ast.literal_eval(arg)) for arg in tilt_call.args)
        horizontal_reach = width / 2 * math.cos(tilt) + height / 2 * math.sin(tilt)
        vertical_reach = height / 2 * math.cos(tilt) + width / 2 * math.sin(tilt)
        magnet = next(call for child in layout.body for call in ast.walk(child)
                      if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute)
                      and call.func.attr == 'cyl')
        magnet_z = ast.literal_eval(magnet.args[0])[2]
        magnet_radius = ast.literal_eval(magnet.args[1])
        self.assertLessEqual(magnet_z + magnet_radius, vertical_reach)

        build = ast.parse((HERE / 'build.py').read_text(encoding='utf-8'))
        calls = [node for node in ast.walk(build) if isinstance(node, ast.Call)
                 and isinstance(node.func, ast.Name) and node.func.id in {'asset', 'box'}
                 and node.args and isinstance(node.args[0], ast.Constant)]
        fridge = next(node for node in calls if node.args[0].value == 'French-door refrigerator')
        fridge_z = ast.literal_eval(fridge.args[1])[2]
        dispenser = []
        for name in ('Water dispenser recess', 'Water dispenser shelf'):
            node = next(node for node in calls if node.args[0].value == name)
            local, size = (ast.literal_eval(node.args[i]) for i in (1, 2))
            dispenser.append((name, local[0], size[0],
                              fridge_z + local[2] - size[2] / 2,
                              fridge_z + local[2] + size[2] / 2))

        exported = json.loads((HERE.parent.parent / 'house-test/house.json').read_text(encoding='utf-8'))
        doors = {b['prop']: b for b in exported['colliders']
                 if b.get('prop') in {'fridge-a', 'fridge-b'} and b['name'].startswith('French door')}
        self.assertEqual(set(doors), {'fridge-a', 'fridge-b'})
        fridge_x = (doors['fridge-a']['max'][0] + doors['fridge-b']['min'][0]) / 2
        for x, z, motif in drawings:
            with self.subTest(motif=motif):
                side = 'fridge-a' if x < fridge_x else 'fridge-b'
                panel = doors[side]
                left, right = x - horizontal_reach, x + horizontal_reach
                bottom, top = z - vertical_reach, z + vertical_reach
                self.assertGreater(left, panel['min'][0] + .02)
                self.assertLess(right, panel['max'][0] - .02)
                self.assertGreater(bottom, panel['min'][1] + .03)
                self.assertLess(top, panel['max'][1] - .03)
                for name, local_x, dispenser_width, low, high in dispenser:
                    # Kitchen quarter-turn plus the refrigerator's own 90°
                    # turn maps local X to minus browser X.
                    dispenser_x = fridge_x - local_x
                    if right <= dispenser_x - dispenser_width / 2 or left >= dispenser_x + dispenser_width / 2:
                        continue
                    self.assertTrue(bottom >= high + .04 or top <= low - .04,
                                    f'{motif} paper or magnet overlaps {name}')

    def test_dispenser_parts_follow_panel_selected_by_world_geometry(self):
        namespace = source_functions('export_walkthrough.py', 'prop_key')
        fridge = types.SimpleNamespace(name='French-door refrigerator',
                                       matrix_world=types.SimpleNamespace(
                                           translation=types.SimpleNamespace(x=2.68)))
        namespace['bpy'] = types.SimpleNamespace(data=types.SimpleNamespace(
            objects={'French-door refrigerator': fridge}))
        prop_key = namespace['prop_key']
        verts = [types.SimpleNamespace(x=x) for x in (2.69, 2.78)]
        for name in ('Water dispenser recess', 'Water dispenser shelf'):
            with self.subTest(name=name):
                self.assertEqual(prop_key(types.SimpleNamespace(name=name, parent=fridge), verts), 'fridge-b')
        self.assertEqual(prop_key(types.SimpleNamespace(name='French door', parent=fridge),
                                  [types.SimpleNamespace(x=2.45)]), 'fridge-a')
        self.assertIsNone(prop_key(types.SimpleNamespace(name='Bottom freezer drawer', parent=fridge), verts))


if __name__ == '__main__':
    unittest.main()
