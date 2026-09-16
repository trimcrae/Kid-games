"""Checks for the optional lightmap bake helpers; no Blender or asset writes.

Needs numpy (Blender's bundled Python has it):
    <blender>/4.5/python/bin/python.exe models/house/test_browser_lightmap.py
"""
import array
import pathlib
import struct
import sys
import unittest
import zlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np
import browser_lightmap as bl


class Helpers(unittest.TestCase):
    def test_uv_encoding_stays_below_the_sentinel(self):
        self.assertEqual(bl.encode_uv(0, 0), (0, 0))
        self.assertEqual(bl.encode_uv(1, 1), (65533, 65533))
        self.assertEqual(bl.encode_uv(.5, .25), (32768, 16384))

    def test_refined_corner_interpolates_inside_its_source_triangle(self):
        tri = [(0, 0, 0), (2, 0, 0), (0, 2, 0)]
        uvs = [(.1, .1), (.3, .1), (.1, .3)]
        self.assertEqual(bl.barycentric_uv((0, 0, 0), tri, uvs), (.1, .1))
        u, v = bl.barycentric_uv((1, 1, 0), tri, uvs)
        self.assertAlmostEqual(u, .2); self.assertAlmostEqual(v, .2)
        u, v = bl.barycentric_uv((5, 5, 0), tri, uvs)  # clamped to the triangle
        self.assertAlmostEqual(u + v, .4)

    def test_island_denoise_never_mixes_islands(self):
        ids = np.zeros((32, 32), np.int64)
        ids[4:14, 4:14], ids[4:14, 16:26] = 1, 2
        rgb = np.where((ids == 1)[..., None], 1.0, 0.0).astype(np.float32) * np.ones(3, np.float32)
        rgb[ids == 2] = 5
        noisy = rgb.copy(); noisy[8, 8] = 3
        out = bl.island_denoise(noisy, ids, 2.0)
        self.assertTrue(np.allclose(out[ids == 2], 5))
        self.assertLess(out[8, 8, 0], 3)
        self.assertTrue((out[ids == 1] < 1.2).all())

    def test_gutters_are_filled(self):
        mask = np.zeros((16, 16), bool); mask[5:8, 5:8] = True
        rgb = np.zeros((16, 16, 3), np.float32); rgb[mask] = 2
        out = bl.dilate(rgb, mask, 2)
        self.assertTrue(np.allclose(out, 2))

    def test_png_is_raw_rgb_without_colour_management(self):
        img = (np.arange(4 * 5 * 3) % 256).astype(np.uint8).reshape(4, 5, 3)
        data = bl.png_bytes(img)
        self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
        chunks, at = {}, 8
        while at < len(data):
            n, kind = struct.unpack('>I4s', data[at:at + 8])
            chunks[kind] = data[at + 8:at + 8 + n]
            at += 12 + n
        self.assertEqual(set(chunks), {b'IHDR', b'IDAT', b'IEND'})
        self.assertEqual(struct.unpack('>IIBBBBB', chunks[b'IHDR']), (5, 4, 8, 2, 0, 0, 0))
        raw = np.frombuffer(zlib.decompress(chunks[b'IDAT']), np.uint8).reshape(4, 16)
        rows, prev = [], np.zeros(15, np.int64)
        for line in raw:
            f, x = line[0], line[1:].astype(np.int64)
            if f == 1:
                for i in range(3, 15):
                    x[i] = (x[i] + x[i - 3]) % 256
            elif f == 2:
                x = (x + prev) % 256
            rows.append(x); prev = x
        self.assertTrue(np.array_equal(np.array(rows).reshape(4, 5, 3), img))

    def test_finalize_keeps_only_triangles_on_their_own_island(self):
        lm = bl.Lightmap(size=256, samples=4)
        lm.id_map = np.zeros((256, 256), np.int64)
        lm.id_map[10:50, 10:50] = 1      # island 1 belongs to object 7
        lm.id_map[60:70, 60:70] = 3      # a floor-proxy face (after 2 islands)
        lm.islands, lm.island_owner = 2, np.array([0, 7, 9, 0])
        lm.dark_ids = {5}
        light, owner = array.array('H'), array.array('I')
        tris = [((20, 20), (40, 20), (20, 40), 7),        # own island: kept
                ((20, 20), (40, 20), (20, 40), 9),        # another object's island
                ((100, 100), (101, 100), (100, 101), 7),  # sliver in a gutter
                ((62, 62), (68, 62), (62, 68), 0),        # projected floor: kept
                ((20, 20), (40, 20), (20, 40), 5)]        # receiver dark in both states
        for *corners, oid in tris:
            for u, v in corners:
                light.extend(bl.encode_uv(u / 256, v / 256)); owner.append(oid)
        light.extend((65535, 65535) * 3); owner.extend((0, 0, 0))
        out = lm.finalize(light, owner)
        self.assertEqual([out[6 * k] != 65535 for k in range(6)], [True, False, False, True, False, False])
        self.assertTrue(all(out[6 * k + j] == 65535 for k in (1, 2, 4, 5) for j in range(6)))
        self.assertEqual((lm.stats['bakedVertices'], lm.stats['sentinelVertices']), (6, 12))

    def test_unknown_rooms_and_bad_sizes_are_rejected(self):
        with self.assertRaises(ValueError):
            bl.Lightmap(rooms=['Attic'])
        with self.assertRaises(ValueError):
            bl.Lightmap(size=3000)


if __name__ == '__main__':
    unittest.main()
