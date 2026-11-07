"""Source-level mesh/stitched-seam regressions. Run with ordinary Python."""
import ast
from collections import Counter
import math
from pathlib import Path
import types
import unittest

HERE = Path(__file__).resolve().parent


class Vector(tuple):
    def __add__(self, other):
        return Vector(a + b for a, b in zip(self, other))

    def __sub__(self, other):
        return Vector(a - b for a, b in zip(self, other))

    def __mul__(self, scalar):
        return Vector(a * scalar for a in self)

    def normalized(self):
        length = math.sqrt(sum(a * a for a in self))
        return Vector(a / length for a in self)


class Mesh:
    def from_pydata(self, vertices, edges, faces):
        self.vertices, self.faces = vertices, faces
        self.polygons = [types.SimpleNamespace(use_smooth=False) for _ in faces]

    def normals_split_custom_set_from_vertices(self, normals):
        self.normals = normals


class Object(dict):
    def __init__(self, name, mesh):
        self.name, self.data = name, mesh


def source_functions():
    tree = ast.parse((HERE / 'build.py').read_text())
    functions = [n for n in tree.body if isinstance(n, ast.FunctionDef)
                 and n.name in {'padded_box', 'tailored_cushion'}]
    assert len(functions) == 2
    namespace = {'math': math, 'Vector': Vector, 'finish': lambda *args: None,
                 'bpy': types.SimpleNamespace(data=types.SimpleNamespace(
                     meshes=types.SimpleNamespace(new=lambda name: Mesh()),
                     objects=types.SimpleNamespace(new=Object)))}
    seams = []

    def curve(name, points, radius, material, closed):
        result = Object(name, None)
        result.points, result.radius, result.closed = points, radius, closed
        seams.append(result)
        return result

    namespace['curve'] = curve
    exec(compile(ast.Module(body=functions, type_ignores=[]), str(HERE / 'build.py'), 'exec'), namespace)
    return namespace, seams


class UpholsteryTests(unittest.TestCase):
    def test_smooth_closed_shapes_keep_their_dimensions_and_normal_budget(self):
        functions, _ = source_functions()
        for size in [(1.2, .7, .18), (.5, .12, .6), (.075, .39, .065), (.2, .86, .36),
                     (2.1, .86, .25), (.52, .44, .075)]:
            with self.subTest(size=size):
                mesh = functions['padded_box']('cushion', (0, 0, 0), size, None, .08).data
                self.assertEqual(len(mesh.faces), 294)
                self.assertLessEqual(len(mesh.vertices), 300)
                edges = Counter()
                for face in mesh.faces:
                    self.assertEqual(len(set(face)), 4)
                    for a, b in zip(face, face[1:] + face[:1]):
                        edges[tuple(sorted((a, b)))] += 1
                    a, b, c = (mesh.vertices[i] for i in face[:3])
                    ab, ac = Vector(b) - a, Vector(c) - a
                    normal = (ab[1] * ac[2] - ab[2] * ac[1],
                              ab[2] * ac[0] - ab[0] * ac[2],
                              ab[0] * ac[1] - ab[1] * ac[0])
                    centre = [sum(mesh.vertices[i][axis] for i in face) / 4 for axis in range(3)]
                    self.assertGreater(sum(n * p for n, p in zip(normal, centre)), 0,
                                       'Each face must wind outwards')
                self.assertEqual(set(edges.values()), {2}, 'Mesh must be closed and manifold')
                for axis in range(3):
                    self.assertAlmostEqual(min(p[axis] for p in mesh.vertices), -size[axis] / 2)
                    self.assertAlmostEqual(max(p[axis] for p in mesh.vertices), size[axis] / 2)
                for normal in mesh.normals:
                    self.assertAlmostEqual(sum(n * n for n in normal), 1)
                self.assertTrue(all(face.use_smooth for face in mesh.polygons))

    def test_seams_follow_the_surface_and_tilt_with_their_cushion(self):
        functions, seams = source_functions()
        for size in [(1.2, .7, .18), (.5, .12, .6), (.075, .39, .065), (.12, .5, .5)]:
            with self.subTest(size=size):
                radius = min(.08, min(size) * .475)
                cushion = functions['tailored_cushion']('sewn', (1, 2, 3), size, None, .08)
                seam = seams[-1]
                self.assertIs(seam.parent, cushion)
                self.assertTrue(seam.closed)
                self.assertFalse(seam['browser_collide'])
                self.assertEqual(len(seam.points), 28)
                half = [s / 2 for s in size]
                inner = [h - radius for h in half]
                for point in seam.points:
                    # Signed distance from the rounded-box shell. The thread
                    # lies just above it, not floating or buried in upholstery.
                    outside = [max(0, abs(p) - h) for p, h in zip(point, inner)]
                    distance = math.sqrt(sum(p * p for p in outside)) - radius
                    self.assertGreaterEqual(distance, 0)
                    self.assertLess(distance, seam.radius * .5)
                    for p, h in zip(point, half):
                        self.assertLess(abs(p) + seam.radius, h + .003)
                axis = min(range(3), key=lambda i: size[i])
                self.assertGreater(seam.points[0][axis] * (-1 if axis == 1 else 1), 0)


if __name__ == '__main__':
    unittest.main()
