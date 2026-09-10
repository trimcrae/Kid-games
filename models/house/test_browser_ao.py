"""Pure-Python checks for the optional AO bake; no Blender or asset writes."""
import array
import collections
import math
import unittest

from browser_ao import (VertexAO, architectural_receiver, benchmark_samples,
                        occludes, sample_key, subdivide_triangle, trace_occlusion)


class Vec:
    def __init__(self, *v): self.v = v
    def __add__(self, b): return Vec(*(x+y for x, y in zip(self.v, b.v)))
    def __mul__(self, s): return Vec(*(x*s for x in self.v))
    def dot(self, b): return sum(x*y for x, y in zip(self.v, b.v))


class Rays:
    def __init__(self, hits): self.hits, self.origins = iter(hits), []
    def ray_cast(self, origin, direction, radius):
        self.origins.append((origin.v, radius))
        hit = next(self.hits, None)
        if hit is None: return None, None, None, None
        distance, normal = hit
        return origin + direction*distance, Vec(*normal), 0, distance


class AmbientOcclusionTests(unittest.TestCase):
    def test_contact_falloff_and_open_hemisphere(self):
        stats = collections.Counter()
        self.assertEqual(trace_occlusion(Rays([]), Vec(0,0,0), Vec(0,1,0), 1, .002, stats), 0)
        self.assertAlmostEqual(trace_occlusion(Rays([(.25,(0,-1,0))]), Vec(0,0,0), Vec(0,1,0), 1, .002, stats), .75**2)
        self.assertEqual(stats['acceptedHits'], 1)

    def test_near_and_backface_hits_retry_without_hiding_real_blocker(self):
        stats = collections.Counter()
        rays = Rays([(.001,(0,-1,0)), (.10,(0,1,0)), (.20,(0,-1,0))])
        value = trace_occlusion(rays, Vec(0,0,0), Vec(0,1,0), 1, .002, stats)
        self.assertAlmostEqual(value, (1-(.001+.004+.10+.004+.20))**2)
        self.assertEqual(stats['ignoredNearHits'], 1)
        self.assertEqual(stats['ignoredBackfaceHits'], 1)
        self.assertAlmostEqual(rays.origins[2][0][1], .109)
        self.assertAlmostEqual(rays.origins[2][1], .891)

    def test_retry_bound(self):
        stats = collections.Counter()
        rays = Rays([(.001,(0,1,0))]*20)
        self.assertEqual(trace_occlusion(rays, Vec(0,0,0), Vec(0,1,0), 1, .002, stats), 0)
        self.assertEqual(len(rays.origins), 5)
        self.assertEqual(stats['retryLimitHits'], 1)

    def test_quantization_reuses_seams_but_keeps_hard_normals(self):
        corner = (1,2,3,0,1,0)
        self.assertEqual(sample_key(corner), sample_key((1.000001,2,3,0,1,0)))
        self.assertNotEqual(sample_key(corner), sample_key((1,2,3,1,0,0)))
        self.assertNotEqual(sample_key(corner), sample_key((1.00003,2,3,0,1,0)))

    def test_tessellation_preserves_area_winding_and_normal(self):
        source = ((0,0,0,0,0,1),(3,0,0,0,0,1),(0,2,0,0,0,1))
        tris = subdivide_triangle(source, edge=.7)
        area = 0
        for a,b,c in tris:
            cross = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
            self.assertGreater(cross, 0)
            area += cross/2
            for p,q in ((a,b),(b,c),(c,a)):
                self.assertLessEqual(math.dist(p[:3],q[:3]), .700001)
                self.assertEqual(p[3:], (0,0,1))
        self.assertAlmostEqual(area, 3)

    def test_skinny_floorboard_and_budget_are_bounded(self):
        tri = ((0,0,0,0,1,0),(12,0,0,0,1,0),(0,0,.12,0,1,0))
        tris = subdivide_triangle(tri, edge=.7)
        self.assertLess(len(tris), 160)
        self.assertAlmostEqual(sum(abs((b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]))/2 for a,b,c in tris), .72)
        self.assertLessEqual(max(math.dist(t[i][:3],t[(i+1)%3][:3]) for t in tris for i in range(3)), .700001)
        self.assertLessEqual(len(subdivide_triangle(tri, edge=.7, max_triangles=7)), 7)
        baker = VertexAO(max_extra_vertices=18)
        for _ in range(10): baker.tessellate(tri, True)
        self.assertLessEqual(baker.stats['extraVertices'], 18)
        self.assertGreater(baker.stats['cappedTriangles'], 0)

    def test_no_refinement_across_bevel_normal_transition(self):
        tri = ((0,0,0,0,1,0),(3,0,0,1,0,0),(0,0,2,0,1,0))
        self.assertEqual(subdivide_triangle(tri), [tri])

    def test_receiver_and_occluder_scope(self):
        self.assertTrue(architectural_receiver('Basement clean resilient floor', '30 | Basement'))
        self.assertFalse(architectural_receiver('Broad lawn floor', '43 | Yard'))
        self.assertFalse(architectural_receiver('Garage foundation skirt', '35 | Garage'))
        self.assertFalse(occludes('Window', dict(surface='glass')))
        self.assertFalse(occludes('Needle geometry', dict(surface='plain')))
        self.assertFalse(occludes('Leaves', dict(surface='foliage')))
        self.assertTrue(occludes('Chair', dict(surface='paint', opacity=1)))

    def test_transparent_receivers_stay_open_and_vertex_alignment_is_checked(self):
        baker = VertexAO()
        self.assertEqual(baker.bake_group(array.array('f',[0,0,0,0,1,0]*4),False), bytes([255]*4))
        with self.assertRaises(ValueError): baker.bake_group([1,2,3],False)

    def test_benchmark_deduplicates_and_is_deterministic(self):
        values = array.array('f',[v for i in range(40) for v in (i,0,0,0,1,0)])
        groups = [dict(values=values*2,finish=dict(surface='paint'))]
        first,count = benchmark_samples(groups,10)
        second,_ = benchmark_samples(groups,10)
        self.assertEqual(count,40)
        self.assertEqual(len(first),60)
        self.assertEqual(first,second)

    def test_occluder_mesh_indices_are_rebased(self):
        baker = VertexAO()
        positions = [(0,0,0),(1,0,0),(0,1,0)]
        baker.add_occluder_mesh(positions,[(0,1,2)])
        baker.add_occluder_mesh(iter(positions),[(0,1,2)])
        self.assertEqual(list(baker.triangles),[0,1,2,3,4,5])


if __name__ == '__main__': unittest.main()
