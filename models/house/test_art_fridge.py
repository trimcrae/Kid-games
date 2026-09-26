"""Fast source-level geometry and moving-prop checks; Blender is not required."""
import ast
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
                        for x, z in points:
                            self.assertGreaterEqual(x, .37 - width / 2 - 1e-10)
                            self.assertLessEqual(x, .37 + width / 2 + 1e-10)
                            self.assertGreaterEqual(z, -.21 - height / 2 - 1e-10)
                            self.assertLessEqual(z, -.21 + height / 2 + 1e-10)

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


class FridgeTests(unittest.TestCase):
    def test_dispenser_parts_follow_left_french_door(self):
        namespace = source_functions('export_walkthrough.py', 'prop_key')
        fridge = types.SimpleNamespace(name='French-door refrigerator',
                                       matrix_world=types.SimpleNamespace(
                                           translation=types.SimpleNamespace(x=5.0)))
        namespace['bpy'] = types.SimpleNamespace(data=types.SimpleNamespace(
            objects={'French-door refrigerator': fridge}))
        prop_key = namespace['prop_key']
        verts = [types.SimpleNamespace(x=x) for x in (4.74, 4.82)]
        for name in ('French door', 'Curved vertical fridge handle',
                     'Water dispenser recess', 'Water dispenser shelf'):
            with self.subTest(name=name):
                self.assertEqual(prop_key(types.SimpleNamespace(name=name, parent=fridge), verts), 'fridge-a')
        self.assertEqual(prop_key(types.SimpleNamespace(name='French door', parent=fridge),
                                  [types.SimpleNamespace(x=5.2)]), 'fridge-b')
        self.assertIsNone(prop_key(types.SimpleNamespace(name='Bottom freezer drawer', parent=fridge), verts))


if __name__ == '__main__':
    unittest.main()
