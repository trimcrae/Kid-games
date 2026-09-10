"""Finish/export contracts; no Blender runtime or private reference required."""
import unittest
from types import SimpleNamespace
from browser_materials import finish_for_name, material_finish, keep_bevel, practical_light, ramp_colliders, oriented_triangle_corners


class BrowserMaterials(unittest.TestCase):
    def test_reflected_faces_keep_outward_winding_and_split_normal_binding(self):
        # Nonuniform reflections across each combination of axes. The inverse
        # transpose normal must face the same way as the transformed triangle,
        # both for rasterization and BVH backface rejection in the AO bake.
        import itertools
        positions = {4: (0, 0, 0), 1: (1, 0, 0), 3: (0, 1, 0)}
        loop_for_vertex = {4: 12, 1: 13, 3: 14}
        for signs in itertools.product((-1, 1), repeat=3):
            scale = tuple(a*b for a,b in zip(signs, (2, 3, 4)))
            mirrored = scale[0]*scale[1]*scale[2] < 0
            corners = oriented_triangle_corners((4, 1, 3), (12, 13, 14), mirrored)
            self.assertTrue(all(loop_for_vertex[v] == loop for v,loop in corners))
            a,b,c = [tuple(p*s for p,s in zip(positions[v], scale)) for v,_ in corners]
            geometric_z = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
            self.assertGreater(geometric_z/scale[2], 0, signs)

    def test_displays_are_opaque_and_windows_are_transparent(self):
        screen = finish_for_name('Dark appliance glass')
        window = finish_for_name('Window glass')
        self.assertEqual(screen['opacity'], 1)
        self.assertEqual(screen['surface'], 'screen')
        self.assertLess(window['opacity'], .4)
        self.assertEqual(window['surface'], 'glass')

    def test_finishes_have_meaningful_physical_differences(self):
        steel = finish_for_name('Brushed stainless')
        carpet = finish_for_name('Clean warm beige carpet')
        oak = finish_for_name('Oak floor board tone 02')
        self.assertEqual(steel['metalness'], 1)
        self.assertEqual(carpet['metalness'], 0)
        self.assertGreater(carpet['roughness'] - steel['roughness'], .5)
        self.assertGreater(oak['clearcoat'], .2)
        self.assertGreater(finish_for_name('Warm glowing bulb')['emissiveIntensity'], 1)

    def test_linked_shader_socket_does_not_export_its_unused_default(self):
        sockets = {'Roughness': SimpleNamespace(default_value=.5, is_linked=True),
                   'Metallic': SimpleNamespace(default_value=.8, is_linked=False)}
        node = SimpleNamespace(type='BSDF_PRINCIPLED', inputs=sockets)
        mat = SimpleNamespace(name='Brushed stainless', use_nodes=True,
                              node_tree=SimpleNamespace(nodes=[node]))
        finish = material_finish(mat)
        self.assertEqual(finish['roughness'], .3)
        self.assertEqual(finish['metalness'], .8)

    def test_architecture_does_not_spend_the_furniture_bevel_budget(self):
        self.assertTrue(keep_bevel('Drawer front', '08 | Kitchen cabinetry', (1, .04, .3), 8))
        for name, collection, size, vertices in [
            ('Oak floor board', '02 | Floors and split levels', (2, .1, .02), 8),
            ('Roof frame', '43 | Exterior roofs and cladding', (2, .2, .2), 8),
            ('Tiny trim', '08 | Kitchen cabinetry', (1, .008, .008), 8),
            ('Sofa cushion', '09 | Living furniture', (1, .5, .2), 400),
        ]:
            self.assertFalse(keep_bevel(name, collection, size, vertices))

    def test_panel_grid_comes_from_the_blender_finish_not_a_wood_assumption(self):
        values = {'Scale': 1, 'Brick Width': 1.2, 'Row Height': .6,
                  'Mortar Size': .010, 'Mortar': [.48, .44, .36, 1]}
        brick = SimpleNamespace(type='TEX_BRICK', offset=0,
            inputs={key: SimpleNamespace(default_value=value) for key, value in values.items()})
        mat = SimpleNamespace(name='Weathered dark exterior panels', use_nodes=True,
                              node_tree=SimpleNamespace(nodes=[brick]))
        finish = material_finish(mat)
        self.assertEqual(finish['surface'], 'panels')
        self.assertEqual(finish['panelSize'], [1.2, .6, .01])
        self.assertEqual(finish['panelOffset'], 0)
        self.assertEqual(finish['mortarColor'], [.48, .44, .36])

    def test_render_softboxes_are_not_house_lamps(self):
        self.assertFalse(practical_light('Front daylight', 'AREA', 1000))
        self.assertFalse(practical_light('Soft daylight sun', 'SUN', 2.2))
        self.assertTrue(practical_light('Living ceiling fill', 'AREA', 55))
        self.assertTrue(practical_light('Floor lamp warm bulb', 'POINT', 42))

    def test_apron_ramp_has_bounded_strips_in_browser_coordinates(self):
        points = [(-6.75,-4.8,-.795),(-.25,-4.8,-.795),
                  (-.25,-1.8,-.16),(-6.75,-1.8,-.16)]
        boxes = ramp_colliders('Apron', points, 'y')
        self.assertEqual(len(boxes), 30)
        self.assertAlmostEqual(boxes[0]['max'][2], 4.8)
        self.assertAlmostEqual(boxes[-1]['min'][2], 1.8)
        self.assertLess(abs(boxes[0]['max'][1] + .795), .012)
        self.assertLess(abs(boxes[-1]['max'][1] + .16), .012)
        for previous, box in zip(boxes, boxes[1:]):
            self.assertAlmostEqual(previous['min'][2], box['max'][2])
            self.assertLess(box['max'][1] - previous['max'][1], .03)

    def test_ramp_rejects_twisted_or_nonrectangular_meshes(self):
        with self.assertRaisesRegex(ValueError, 'planar'):
            ramp_colliders('Twisted', [(0,0,0),(1,0,0),(1,1,1),(0,1,2)], 'y')
        with self.assertRaisesRegex(ValueError, 'rectangular'):
            ramp_colliders('Triangle', [(0,0,0),(1,0,0),(.5,.5,.5),(0,1,1)], 'y')


if __name__ == '__main__':
    unittest.main()
