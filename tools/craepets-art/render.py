#!/usr/bin/env python3
"""
Craepets clay art — rendered with Blender, from code.

Every creature, egg, petpet and wardrobe item in Craepets is built here out
of spheres, cones and tubes, grown a coat of real hair (a Cycles hair
particle system), lit like a wildlife photo and rendered with Blender's
Cycles engine (CPU, headless — no GPU needed). Nothing is drawn by an image
model: the shapes are code, the light is physics, and the result is
reproducible from this file alone.

Output (all under games/craepets/art/):
    <species>.webp     one sprite sheet per creature: six expression frames
                       in WHITE fur, and every wardrobe item rendered ON
                       that creature (body hidden but occluding) so hats
                       sit right on every head.
    <species>-id.webp  the colour-ID mask for each frame (lossless).
    egg.webp, egg-id.webp   the egg, three crack stages, + masks.
    petpets.webp       the eight petpets in their own colours.
    manifest.js        where every tile is (window.CPArt).

The white fur is tinted in the browser by pets.js: the mask says which
pixels are "body" (red) and which are "accent" (green), and the palette the
player chose is painted through the render's own light and shade. That is
how one render becomes a Berry Red, a Rainbow and a Starry Night Blorb.

Usage:
    pip install bpy pillow
    python3 tools/craepets-art/render.py                 # everything
    python3 tools/craepets-art/render.py --species blorb # one creature
    python3 tools/craepets-art/render.py --only egg,petpets
    python3 tools/craepets-art/render.py --samples 16    # quick & noisy
    python3 tools/craepets-art/render.py --force         # redo existing
    python3 tools/craepets-art/render.py --repack --force # re-pack from rendered tiles

Sheet layout: tiles are CELL px per grid cell; a creature/egg tile is
16 x 22 cells, a petpet tile 8 x 8. Feet stand on the tile's bottom edge.
"""
import argparse, json, math, os, sys, time

import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT_DIR = os.path.join(ROOT, "games", "craepets", "art")

CELL = 20                     # device px per grid cell in the sheets (a phone draws ~25)
FRAME_W, FRAME_H = 16, 22     # a creature tile, in cells (two cells of extra hat room)
PP_W, PP_H = 8, 8             # a petpet tile, in cells
UNIT = 0.25                   # world units per cell  (a creature is ~3.5 wide)

FRAMES = ["idle", "blink", "happy", "sleep", "walk", "happywalk"]

# ---- palette of FIXED features (never re-tinted by the game) --------------
COL = {
    "white":  (0.97, 0.97, 0.97),
    "pupil":  (0.14, 0.12, 0.21),      # #241f36
    "mouth":  (0.23, 0.13, 0.21),      # #3a2036
    "cheek":  (1.00, 0.62, 0.71),      # #ff9db5
    "clay":   (0.92, 0.92, 0.92),      # the tintable white clay
}

def srgb(hexstr):
    """'#rrggbb' -> linear rgb tuple for Blender."""
    h = hexstr.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b))


# ===========================================================================
#  Scene plumbing
# ===========================================================================
class Scene:
    """A fresh Blender scene with the shared camera and toy-photo lighting."""

    def __init__(self, cells_w, cells_h, samples):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.sc = bpy.context.scene
        self.samples = samples
        self.mats = {}          # material -> class ("body"/"accent"/"eye"/"fixed")
        self.objs = []          # everything we made (for holdout toggling)
        self.body_objs = []     # the creature itself (hidden for wear renders)
        self.cells_w, self.cells_h = cells_w, cells_h
        self._setup_render()
        self._lights()
        self._floor()
        self._camera()

    # ---- render settings -------------------------------------------------
    def _setup_render(self):
        sc = self.sc
        sc.render.engine = "CYCLES"
        sc.cycles.device = "CPU"
        sc.cycles.samples = self.samples
        sc.cycles.use_denoising = True
        sc.cycles.seed = 7
        sc.render.resolution_x = self.cells_w * CELL
        sc.render.resolution_y = self.cells_h * CELL
        sc.render.resolution_percentage = 100
        sc.render.film_transparent = True
        sc.render.image_settings.file_format = "PNG"
        sc.render.image_settings.color_mode = "RGBA"
        sc.render.image_settings.compression = 60
        # Standard (plain sRGB), not AgX: the browser tint multiplies the
        # palette colour through the clay's light in LINEAR light, so the
        # render must encode light faithfully rather than through a
        # filmic curve that flattens the top of the range.
        sc.view_settings.view_transform = "Standard"
        sc.view_settings.look = "None"

    def _lights(self):
        """A product-photo studio: one big soft key from high on the left,
        a dim cool fill, a warm rim from behind and a low cream light in
        front that stands in for the floor bounce. The ambient is kept low
        so the underside of the clay really falls into shade — that
        light-to-dark sweep is what reads as 3D once the tint goes on."""
        w = bpy.data.worlds.new("w"); self.sc.world = w; w.use_nodes = True
        bg = w.node_tree.nodes["Background"]
        bg.inputs[0].default_value = (0.82, 0.9, 1.0, 1)
        bg.inputs[1].default_value = 0.08
        self.lights = []
        def light(loc, energy, size, col=(1, 1, 1), aim=(0, 0, 1.6)):
            bpy.ops.object.light_add(type="AREA", location=loc)
            L = bpy.context.object
            L.data.energy, L.data.size, L.data.color = energy, size, col
            d = Vector(aim) - Vector(loc)
            L.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
            self.lights.append(L)
        # The key is nearly overhead: the top of the clay is bright, the
        # sides roll off and the underside is left to the bounce. A light
        # in FRONT of the creature lights the whole face we see and the
        # render comes out flat.
        light((-1.0, -1.5, 9.5), 480, 5, (1.0, 0.97, 0.92))             # key: big softbox, high and a little left
        light((5.5, -3.0, 2.6), 70, 6, (0.8, 0.88, 1.0))                # fill: dim and cool
        light((2.8, 4.5, 4.2), 650, 3, (1.0, 0.9, 0.8))                 # rim: warm edge light, behind right
        light((0.0, -5.5, 0.35), 80, 7, (1.0, 0.94, 0.86), (0, 0, 0.9))   # floor bounce on the underside

    def _floor(self):
        """A floor that only shows the creature's shadow: the soft contact
        shadow under the belly and between the feet is what plants a toy
        on a table instead of floating on the page."""
        bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
        f = bpy.context.object; f.name = "floor"
        f.is_shadow_catcher = True
        m = bpy.data.materials.new("floor"); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (0.9, 0.86, 0.8, 1)
        b.inputs["Roughness"].default_value = 0.9
        f.data.materials.append(m)
        self.floor = f

    def _camera(self):
        """A 60mm lens tilted 12 degrees down. The camera is slid so the
        floor point (0,-1.7,0) — where the feet touch — sits on the tile's bottom edge and the tile is
        exactly cells_w cells wide at the creature's depth (y = 0)."""
        tilt = math.radians(12)
        lens, sensor = 60.0, 36.0
        width = self.cells_w * UNIT
        dist = (width / 2) / (sensor / 2 / lens)
        bpy.ops.object.camera_add()
        cam = bpy.context.object
        cam.data.lens, cam.data.sensor_width = lens, sensor
        cam.data.sensor_fit = "HORIZONTAL"
        cam.data.clip_start = 0.1
        self.sc.camera = cam
        self.cam = cam

        def place(zt):
            target = Vector((0, 0, zt))
            cam.location = target + dist * Vector((0, -math.cos(tilt), math.sin(tilt)))
            cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
            bpy.context.view_layer.update()
            return world_to_camera_view(self.sc, cam, Vector((0, -1.7, 0))).y

        lo, hi = -2.0, 6.0                       # bisect the aim height
        for _ in range(40):
            mid = (lo + hi) / 2
            if place(mid) > 0.012: lo = mid
            else: hi = mid
        place((lo + hi) / 2)

    # ---- materials ---------------------------------------------------------
    def mat(self, name, rgb, kind="fixed", rough=0.5, sss=0.0, metallic=0.0,
            emit=0.0, spec=0.5, coat=0.0, coat_rough=0.2, sheen=0.0, sheen_rough=0.5):
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (*rgb, 1)
        b.inputs["Roughness"].default_value = rough
        b.inputs["Metallic"].default_value = metallic
        b.inputs["Specular IOR Level"].default_value = spec
        if sss:
            b.inputs["Subsurface Weight"].default_value = sss
            b.inputs["Subsurface Radius"].default_value = (0.25, 0.25, 0.25) if kind != "fixed" else (0.3, 0.15, 0.1)
            b.inputs["Subsurface Scale"].default_value = 0.6
        if coat:
            # a thin glaze: the soft window-shaped highlight of glazed clay
            b.inputs["Coat Weight"].default_value = coat
            b.inputs["Coat Roughness"].default_value = coat_rough
        if sheen:
            # velvet: a soft light along the edges, like fuzz on a plush toy
            b.inputs["Sheen Weight"].default_value = sheen
            b.inputs["Sheen Roughness"].default_value = sheen_rough
            b.inputs["Sheen Tint"].default_value = (1, 1, 1, 1)
        if emit:
            b.inputs["Emission Color"].default_value = (*rgb, 1)
            b.inputs["Emission Strength"].default_value = emit
        self.mats[m] = kind
        return m

    clay_rough = 0.8              # a species can ask for moister skin (a frog)

    def clay(self, kind="body"):
        """The tintable white skin (body or accent — same look, different
        mask): matte, with a little subsurface so it looks like flesh under
        the coat, and a velvet sheen on the edges. Fur grows out of it."""
        key = "clay-" + kind
        for m, k in self.mats.items():
            if m.name == key: return m
        return self.mat(key, COL["clay"], kind, rough=self.clay_rough, spec=0.25, sss=0.3,
                        sheen=0.25, sheen_rough=0.6)

    def fur_mat(self, kind="body", rgb=None):
        """The coat: a Principled Hair BSDF, white (tintable) or a fixed
        colour. Registered like any other material so the ID pass paints it
        in its class colour."""
        key = "fur-" + kind + ("" if rgb is None else "-%02x%02x%02x" % tuple(int(c * 255) for c in rgb))
        for m in self.mats:
            if m.name == key: return m
        m = bpy.data.materials.new(key); m.use_nodes = True
        nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        h = nt.nodes.new("ShaderNodeBsdfHairPrincipled")
        h.parametrization = "COLOR"
        h.inputs["Color"].default_value = (*(rgb if rgb is not None else COL["clay"]), 1)
        h.inputs["Roughness"].default_value = 0.4
        h.inputs["Radial Roughness"].default_value = 0.45
        h.inputs["Coat"].default_value = 0.0
        h.inputs["Random Roughness"].default_value = 0.2
        nt.links.new(h.outputs[0], out.inputs[0])
        self.mats[m] = kind
        return m

    def fur(self, obj, m, length=0.16, density=110, children=12, down=0.45, clump=0.5,
            rand=0.25, radius=0.0045, weight=None):
        """Grow a coat on a mesh: a hair particle system, combed a little
        downward like fur under gravity, in clumps, with interpolated
        children for density. `density` is parent strands per unit of
        surface; `weight(x, y, z) -> 0..1` thins and shortens the coat
        (round the face, say). The object's scale and rotation are baked
        into the mesh first so lengths come out in world units."""
        if obj.type != "MESH": return
        me = obj.data
        M = obj.matrix_world.to_3x3()
        for v in me.vertices: v.co = M @ v.co
        obj.rotation_euler = (0, 0, 0); obj.scale = (1, 1, 1)
        me.update()
        area = sum(p.area for p in me.polygons)
        if weight is not None:
            vg = obj.vertex_groups.new(name="coat")
            loc = obj.location
            for v in me.vertices:
                w = weight(loc.x + v.co.x, loc.y + v.co.y, loc.z + v.co.z)
                vg.add([v.index], max(0.0, min(1.0, w)), "REPLACE")
        me.materials.append(m)
        mod = obj.modifiers.new("fur", "PARTICLE_SYSTEM")
        ps = mod.particle_system; st = ps.settings
        st.type = "HAIR"; st.count = max(60, int(density * area)); st.hair_length = length
        st.hair_step = 4; st.use_advanced_hair = True
        st.emit_from = "FACE"; st.use_emit_random = True
        # with advanced hair the velocity only sets the DIRECTION as long as
        # it stays small (about 0.1): any bigger and the strands balloon
        st.normal_factor = 0.1; st.object_align_factor = (0, 0, -down * 0.1); st.factor_random = rand * 0.1
        st.child_type = "INTERPOLATED"; st.child_percent = 1; st.rendered_child_count = children
        st.clump_factor = clump; st.clump_shape = 0.25
        st.roughness_2 = length * 0.35; st.roughness_2_size = 1.5; st.roughness_endpoint = length * 0.2
        st.radius_scale = radius; st.root_radius = 1.0; st.tip_radius = 0.0; st.use_close_tip = True
        st.material = len(me.materials)
        if weight is not None:
            ps.vertex_group_density = "coat"; ps.vertex_group_length = "coat"
        return obj

    def fixed(self, name, hexcol, **kw):
        return self.mat(name, srgb(hexcol), "fixed", **kw)

    # glossy toy eyes (class "eye": never tinted, masked blue)
    def eye_white(self, kind="eye"):
        return self.mat("eyewhite", COL["white"], kind, rough=0.12, coat=1.0, coat_rough=0.05)

    def eye_iris(self, hexcol, kind="eye"):
        return self.mat("iris", srgb(hexcol), kind, rough=0.3, coat=1.0, coat_rough=0.05)

    def eye_pupil(self, kind="eye"):
        return self.mat("pupil", COL["pupil"], kind, rough=0.08, spec=0.7, coat=1.0, coat_rough=0.03)

    def eye_glint(self, kind="eye"):
        return self.mat("glint", (1, 1, 1), kind, rough=0.1, emit=3.5)

    # ---- primitives ----------------------------------------------------------
    def _finish(self, o, m, name, smooth=True):
        o.name = name
        if smooth:
            for p in o.data.polygons: p.use_smooth = True
        o.data.materials.append(m)
        self.objs.append(o)
        return o

    def sphere(self, name, loc, r, m, scale=(1, 1, 1), rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, rotation=rot,
                                             segments=48, ring_count=32)
        o = bpy.context.object; o.scale = scale
        return self._finish(o, m, name)

    def cone(self, name, loc, r1, depth, m, rot=(0, 0, 0), r2=0.0, scale=(1, 1, 1)):
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=r1, radius2=r2, depth=depth,
                                        location=loc, rotation=rot)
        o = bpy.context.object; o.scale = scale
        return self._finish(o, m, name)

    def cylinder(self, name, loc, r, depth, m, rot=(0, 0, 0), scale=(1, 1, 1)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=depth,
                                            location=loc, rotation=rot)
        o = bpy.context.object; o.scale = scale
        return self._finish(o, m, name)

    def torus(self, name, loc, R, r, m, rot=(0, 0, 0), scale=(1, 1, 1)):
        bpy.ops.mesh.primitive_torus_add(location=loc, rotation=rot, major_radius=R,
                                         minor_radius=r, major_segments=64, minor_segments=24)
        o = bpy.context.object; o.scale = scale
        return self._finish(o, m, name)

    def tube(self, name, pts, r, m):
        """A smooth tube through a list of points: a bevelled poly curve."""
        cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
        cu.bevel_depth = r; cu.bevel_resolution = 6; cu.resolution_u = 12
        cu.use_fill_caps = True
        sp = cu.splines.new("NURBS"); sp.points.add(len(pts) - 1)
        for p, (x, y, z) in zip(sp.points, pts): p.co = (x, y, z, 1)
        sp.use_endpoint_u = True; sp.order_u = min(4, len(pts))
        o = bpy.data.objects.new(name, cu); self.sc.collection.objects.link(o)
        cu.materials.append(m); self.objs.append(o)
        return o

    def star(self, name, loc, r_out, r_in, depth, m, points=5, rot=(0, 0, 0)):
        """An extruded star, standing up so it faces the camera."""
        import bmesh
        me = bpy.data.meshes.new(name); bm = bmesh.new()
        verts = []
        for i in range(points * 2):
            a = math.pi / 2 + i * math.pi / points
            rr = r_out if i % 2 == 0 else r_in
            verts.append(bm.verts.new((math.cos(a) * rr, 0, math.sin(a) * rr)))
        f = bm.faces.new(verts)
        res = bmesh.ops.extrude_face_region(bm, geom=[f])
        for v in [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]:
            v.co.y += depth
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, -depth / 2, 0))
        bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); self.sc.collection.objects.link(o)
        o.location, o.rotation_euler = loc, rot
        return self._finish(o, m, name, smooth=False)

    def metaball(self, name, elements, m, resolution=0.06):
        mb = bpy.data.metaballs.new(name)
        mb.resolution = resolution; mb.render_resolution = resolution
        for (x, y, z, r) in elements:
            el = mb.elements.new(); el.co = (x, y, z); el.radius = r
        o = bpy.data.objects.new(name, mb); self.sc.collection.objects.link(o)
        mb.materials.append(m); self.objs.append(o)
        return o

    # ---- rendering passes ----------------------------------------------------
    def render(self, path):
        self.sc.render.filepath = path
        bpy.ops.render.render(write_still=True)

    def render_id(self, path):
        """Swap every material for a flat emission colour that encodes its
        class (body = red, accent = green, eyes = blue) and render without
        lights: a clean anti-aliased mask the game tints through."""
        saved = {}
        for m, kind in self.mats.items():
            nt = m.node_tree
            out = nt.nodes["Material Output"]
            saved[m] = [(l.from_node, l.from_socket) for l in out.inputs[0].links]
            col = {"body": (1, 0, 0), "accent": (0, 1, 0), "eye": (0, 0, 1)}.get(kind, (0, 0, 0))
            em = nt.nodes.new("ShaderNodeEmission")
            em.name = "idpass"
            em.inputs[0].default_value = (*col, 1); em.inputs[1].default_value = 1.0
            for l in list(out.inputs[0].links): nt.links.remove(l)
            nt.links.new(em.outputs[0], out.inputs[0])
        for L in self.lights: L.hide_render = True
        self.floor.hide_render = True
        bg = self.sc.world.node_tree.nodes["Background"]
        bg_strength = bg.inputs[1].default_value; bg.inputs[1].default_value = 0.0
        vt = self.sc.view_settings.view_transform
        self.sc.view_settings.view_transform = "Standard"
        s, d = self.sc.cycles.samples, self.sc.cycles.use_denoising
        self.sc.cycles.samples, self.sc.cycles.use_denoising = 32, False
        self.render(path)
        # put everything back
        self.sc.cycles.samples, self.sc.cycles.use_denoising = s, d
        self.sc.view_settings.view_transform = vt
        bg.inputs[1].default_value = bg_strength
        for L in self.lights: L.hide_render = False
        self.floor.hide_render = False
        for m in self.mats:
            nt = m.node_tree
            nt.nodes.remove(nt.nodes["idpass"])
            out = nt.nodes["Material Output"]
            for (node, sock) in saved[m]: nt.links.new(sock, out.inputs[0])

    def set_holdout(self, objs, on):
        for o in objs: o.is_holdout = on

    def remove(self, objs):
        gone = set(o.name for o in objs)
        self.objs = [o for o in self.objs if o.name not in gone]
        for o in objs:
            data = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            # drop the orphaned mesh/curve too, so a long wear run stays lean
            try:
                if data is not None and data.users == 0:
                    coll = bpy.data.meshes if data.bl_rna.identifier == "Mesh" else (bpy.data.curves if data.bl_rna.identifier == "Curve" else None)
                    if coll is not None: coll.remove(data)
            except Exception:
                pass


# ===========================================================================
#  A creature: a body plus a face, feet and species trimmings
# ===========================================================================
def ell_front_y(c, rad, x, z):
    """y on the FRONT surface of the ellipsoid (centre c, radii rad) at x,z."""
    cx, cy, cz = c; rx, ry, rz = rad
    t = 1 - ((x - cx) / rx) ** 2 - ((z - cz) / rz) ** 2
    return cy - ry * math.sqrt(max(0.0, t))


class Creature:
    """Builds one species into a Scene. `frame` picks the expression.
    Subclasses set the body and add ears/horns/tails in `trim()`."""
    body_c = (0, 0, 1.55)
    body_r = (1.45, 1.38, 1.5)
    eye_dx, eye_z, eye_r = 0.52, 1.95, 0.3
    cheek_dx, cheek_z = 0.98, 1.48
    mouth_z, mouth_w = 1.5, 0.3
    feet = True
    foot_dx, foot_y, foot_r = 0.75, -0.55, 0.42
    foot_scale = (1, 1.25, 0.55)
    iris = "#c98a2e"              # eye colour (never tinted)
    nose = True
    skin_rough = 0.8
    # the coat: hair length per body part (0 or missing = bare skin)
    fur = {"body": 0.17, "belly": 0.14, "foot": 0.08, "ear": 0.08, "tail": 0.1,
           "body2": 0.14, "body3": 0.1, "body4": 0.07, "tuft": 0.1, "tuft2": 0.08, "spark": 0.08, "spark2": 0.06}

    def __init__(self, S, frame="idle"):
        self.S, self.frame = S, frame
        self.body, self.face_objs, self.feet_objs = [], [], []
        S.clay_rough = self.skin_rough
        self.build()
        self.coat()
        self.set_frame(frame)

    # ---- pieces ------------------------------------------------------------
    def build(self):
        """The body — everything that stays put between frames. The face
        is built by set_frame(), so one creature (and one coat of hair,
        which Blender lays differently every time a scene is rebuilt)
        serves every expression: the fur never jumps between frames."""
        S = self.S
        self.body.append(S.sphere("body", self.body_c, 1.0, S.clay("body"), scale=self.body_r))
        self.trim()
        self.belly()
        if self.feet: self.make_feet()

    def set_frame(self, frame):
        """Swap in the face for `frame` and pose the feet."""
        self.frame = frame
        S = self.S
        if self.face_objs: S.remove(self.face_objs)
        self.face_objs = []
        self.face()
        self.pose_feet()
        S.body_objs = self.body + self.face_objs

    def trim(self): pass

    # ---- the coat ----------------------------------------------------------
    def face_weight(self, x, y, z):
        """How much coat grows at a point on the body: full everywhere but
        the face, where it thins and shortens so the eyes, nose and mouth
        sit in short fur the way they do on a real animal."""
        cx, cy, cz = self.body_c; rx, ry, rz = self.body_r
        front = max(0.0, -(y - cy) / ry)                          # 1 at the very front
        lo, hi = self.mouth_z - 0.35, self.eye_z + self.eye_r + 0.25
        fz = 1.0 if lo <= z <= hi else max(0.0, 1 - min(abs(z - lo), abs(z - hi)) / 0.3)
        span = self.eye_dx + self.eye_r + 0.2
        fx = 1.0 if abs(x) <= span else max(0.0, 1 - (abs(x) - span) / 0.3)
        f = max(0.0, (front - 0.55) / 0.45) * fz * fx
        return 1 - 0.75 * f

    def coat(self):
        S = self.S
        for o in list(self.body):
            if o.type != "MESH" or not o.data.materials: continue
            L = self.fur.get(o.name.split(".")[0], 0)
            if not L: continue
            kind = S.mats.get(o.data.materials[0], "fixed")
            if kind not in ("body", "accent"): continue
            S.fur(o, S.fur_mat(kind), L, weight=self.face_weight if o.name.startswith("body") else None)

    def front(self, x, z, inset=0.0):
        return ell_front_y(self.body_c, self.body_r, x, z) + inset

    def belly(self):
        S = self.S
        cx, cy, cz = self.body_c; rx, ry, rz = self.body_r
        self.body.append(S.sphere("belly", (cx, cy - ry * 0.5, cz - rz * 0.48), 1.0,
                                  S.clay("accent"), scale=(rx * 0.6, ry * 0.56, rz * 0.42)))

    def eyes(self):
        S = self.S
        mode = {"blink": "closed", "sleep": "sleepy", "happy": "happy", "happywalk": "happy"}.get(self.frame, "open")
        for sx in (-1, 1):
            x, z, r = sx * self.eye_dx, self.eye_z, self.eye_r
            y = self.front(x, z)
            if mode == "open":
                # animal eyes: a white, a coloured iris, a small dark pupil,
                # all glossy so the softbox reflects in them, plus a pin of
                # light so they always catch
                self.face_objs.append(S.sphere("eye", (x, y + 0.02, z), r, S.eye_white(), scale=(1, 0.55, 1.15)))
                self.face_objs.append(S.sphere("iris", (x, y - r * 0.5, z + 0.02), r * 0.66, S.eye_iris(self.iris),
                                          scale=(1, 0.5, 1.15)))
                self.face_objs.append(S.sphere("pupil", (x, y - r * 0.7, z + 0.02), r * 0.36, S.eye_pupil(),
                                          scale=(1, 0.5, 1.15)))
                self.face_objs.append(S.sphere("glint", (x - r * 0.24, y - r * 0.86, z + r * 0.36), r * 0.16, S.eye_glint()))
            else:
                k = S.mat("lid", COL["pupil"], "eye", rough=0.35)
                pts = []
                if mode == "closed":
                    for i in range(5):
                        t = -1 + i / 2.0
                        pts.append((x + t * r * 0.95, self.front(x + t * r * 0.95, z) - 0.02, z))
                elif mode == "sleepy":                     # a soft ⌒
                    for i in range(7):
                        a = math.pi * (1 - i / 6.0)
                        px, pz = x + math.cos(a) * r * 0.95, z - r * 0.35 + math.sin(a) * r * 0.45
                        pts.append((px, self.front(px, pz) - 0.02, pz))
                else:                                      # happy: a big ^ arch
                    for i in range(7):
                        a = math.pi * (1 - i / 6.0)
                        px, pz = x + math.cos(a) * r * 1.05, z - r * 0.35 + math.sin(a) * r * 1.0
                        pts.append((px, self.front(px, pz) - 0.02, pz))
                self.face_objs.append(S.tube("lid", pts, 0.055 if mode == "happy" else 0.045, k))

    def mouth(self):
        S = self.S
        m = S.fixed("mouth", "#3a2036", rough=0.4)
        small = self.frame == "sleep"
        w = self.mouth_w * (0.35 if small else 1.0)
        big = self.frame in ("happy", "happywalk")
        pts = []
        for i in range(7):
            t = -1 + i / 3.0
            x = t * w
            z = self.mouth_z - (1 - t * t) * w * (0.55 if big else 0.4) + w * 0.35
            pts.append((x, self.front(x, z) - 0.05, z))
        self.face_objs.append(S.tube("mouth", pts, 0.05 if big else 0.04, m))

    def make_nose(self):
        if not self.nose: return
        S = self.S
        z = self.mouth_z + (self.eye_z - self.mouth_z) * 0.52
        self.face_objs.append(S.sphere("nose", (0, self.front(0, z) + 0.05, z), 0.11,
                                  S.fixed("nose", "#3a2036", rough=0.3), scale=(1.3, 0.6, 0.85)))

    def face(self):
        self.eyes(); self.make_nose(); self.mouth()

    def make_feet(self):
        S = self.S
        for sx in (-1, 1):
            o = S.sphere("foot", (sx * self.foot_dx, self.foot_y, self.foot_r * self.foot_scale[2]), self.foot_r,
                         S.clay("body"), scale=self.foot_scale)
            self.body.append(o); self.feet_objs.append((o, sx))

    def pose_feet(self):
        """Walking lifts the left foot; the foot object just moves, so its
        coat stays exactly as it was."""
        up = self.frame in ("walk", "happywalk")
        for o, sx in self.feet_objs:
            z, y = self.foot_r * self.foot_scale[2], self.foot_y
            if up and sx < 0: z += 0.32; y -= 0.18
            o.location = (sx * self.foot_dx, y, z)

    # ---- anchors for the wardrobe ----------------------------------------
    def head_top(self):
        cx, cy, cz = self.body_c; rx, ry, rz = self.body_r
        return (cx, cy, cz + rz)

    def eye_anchor(self):
        return [(sx * self.eye_dx, self.front(sx * self.eye_dx, self.eye_z), self.eye_z, self.eye_r) for sx in (-1, 1)]

    def neck(self):
        """(z, horizontal radius, depth radius) of the body just under the chin."""
        cx, cy, cz = self.body_c; rx, ry, rz = self.body_r
        z = cz - rz * 0.22
        k = math.sqrt(max(0.0, 1 - ((z - cz) / rz) ** 2))
        return (z, rx * k, ry * k)


class Blorb(Creature):
    """Round, bouncy and permanently pleased. No ears at all — a ball of
    fluff like a chinchilla."""
    iris = "#b8752a"
    fur = dict(Creature.fur, body=0.2, belly=0.16)


class Snorbit(Creature):
    """Two tall ears and enormous back feet."""
    body_c = (0, 0, 1.5); body_r = (1.42, 1.35, 1.42)
    iris = "#6b4a2a"
    foot_dx, foot_y, foot_r, foot_scale = 0.9, -0.62, 0.55, (1.1, 1.3, 0.5)

    def trim(self):
        S = self.S
        for sx in (-1, 1):
            x = sx * 0.58
            self.body.append(S.sphere("ear", (x, 0.05, 3.25), 0.3, S.clay("body"), scale=(1, 0.8, 2.1),
                                      rot=(0, sx * math.radians(6), 0)))
            self.body.append(S.sphere("earin", (x, -0.12, 3.25), 0.3, S.clay("accent"), scale=(0.55, 0.55, 1.65),
                                      rot=(0, sx * math.radians(6), 0)))


class Flarn(Creature):
    """A pocket dragon: two horns and two folded wings. Smooth skin, no coat."""
    body_c = (0, 0, 1.55); body_r = (1.42, 1.35, 1.5)
    iris = "#8fb63a"; skin_rough = 0.65; fur = {}

    def trim(self):
        S = self.S
        horn = S.clay("accent")
        for sx in (-1, 1):
            self.body.append(S.cone("horn", (sx * 0.78, -0.1, 3.05), 0.27, 0.95, horn,
                                    rot=(math.radians(-8), sx * math.radians(24), 0)))
            self.body.append(S.sphere("wing", (sx * 1.5, 0.25, 1.35), 0.55, horn, scale=(0.5, 0.95, 0.85),
                                      rot=(0, sx * math.radians(-15), 0)))
            self.body.append(S.sphere("wingtip", (sx * 1.55, 0.05, 1.95), 0.3, horn, scale=(0.45, 0.6, 0.9)))
        # a little tail poking out behind on the right
        self.body.append(S.cone("tail", (1.15, 0.9, 0.45), 0.2, 0.9, S.clay("body"),
                                rot=(math.radians(-60), 0, math.radians(-30))))


class Twiggle(Creature):
    """A leafy little fawn from the deep woods."""
    body_c = (0, 0, 1.55); body_r = (1.4, 1.35, 1.5)
    iris = "#5a3d22"
    fur = dict(Creature.fur, body=0.13, belly=0.11)
    foot_dx = 0.72

    def trim(self):
        S = self.S
        leaf = S.clay("accent")
        for sx in (-1, 1):
            # a leaf growing out of the top of the head, leaning outward
            self.body.append(S.sphere("leaf", (sx * 1.0, -0.05, 2.8), 0.48, leaf, scale=(0.55, 0.3, 1.0),
                                      rot=(0, sx * math.radians(-42), 0)))
            self.body.append(S.tube("stem", [(sx * 0.6, 0.0, 2.75), (sx * 0.95, -0.05, 2.9)], 0.06, S.clay("body")))


class Puddlepop(Creature):
    """Half kitten, half raindrop: pointed ears and a curl of tail."""
    body_c = (0, 0, 1.55); body_r = (1.32, 1.3, 1.55)
    iris = "#63b26a"
    eye_dx, cheek_dx = 0.48, 0.9
    foot_dx = 0.68

    def trim(self):
        S = self.S
        for sx in (-1, 1):
            self.body.append(S.cone("ear", (sx * 0.78, 0.05, 2.9), 0.36, 0.85, S.clay("body"),
                                    rot=(0, sx * math.radians(18), 0)))
            self.body.append(S.cone("earin", (sx * 0.78, -0.13, 2.85), 0.2, 0.55, S.clay("accent"),
                                    rot=(0, sx * math.radians(18), 0)))
        self.body.append(S.torus("tail", (1.45, 0.35, 0.72), 0.4, 0.14, S.clay("body"),
                                 rot=(math.radians(90), 0, math.radians(-20))))
        self.body.append(S.sphere("tailtip", (1.45, 0.35, 0.32), 0.15, S.clay("accent")))


class Zibbit(Creature):
    """A star frog: wide flat head, bulging eyes on top, a huge grin. Moist
    smooth skin, no coat, and nostrils rather than a nose."""
    body_c = (0, 0, 1.3); body_r = (1.7, 1.4, 1.28)
    iris = "#e0a83a"; skin_rough = 0.4; fur = {}; nose = False
    eye_dx, eye_z, eye_r = 0.82, 2.3, 0.36
    cheek_dx, cheek_z = 1.2, 1.35
    mouth_z, mouth_w = 1.3, 0.72
    foot_dx, foot_y, foot_r, foot_scale = 0.95, -0.75, 0.5, (1.25, 1.4, 0.36)

    def eyes(self):
        """Eyes that sit ON TOP of the flat head, like a frog's, with the
        pupils on the side of each eyeball that faces the camera."""
        S = self.S
        mode = {"blink": "closed", "sleep": "sleepy", "happy": "happy", "happywalk": "happy"}.get(self.frame, "open")
        EY = -0.35
        for sx in (-1, 1):
            x, z, r = sx * self.eye_dx, self.eye_z, self.eye_r
            self.face_objs.append(S.sphere("eyeball", (x, EY, z), r, S.eye_white()))
            if mode == "open":
                self.face_objs.append(S.sphere("iris", (x, EY - r * 0.68, z + r * 0.2), r * 0.56, S.eye_iris(self.iris),
                                          scale=(1, 0.6, 1)))
                self.face_objs.append(S.sphere("pupil", (x, EY - r * 0.82, z + r * 0.2), r * 0.3, S.eye_pupil(),
                                          scale=(1, 0.6, 1)))
                self.face_objs.append(S.sphere("glint", (x - r * 0.2, EY - r * 0.98, z + r * 0.42), r * 0.15, S.eye_glint()))
            else:
                k = S.mat("lid", COL["pupil"], "eye", rough=0.35)
                pts = []
                for i in range(7):
                    a = math.pi * (1 - i / 6.0)
                    px = x + math.cos(a) * r * 0.8
                    pz = z + r * 0.2 + (math.sin(a) * r * (0.6 if mode == "happy" else 0.2) - (0.1 * r if mode != "happy" else 0.05 * r))
                    dy = math.sqrt(max(0.0, r * r - (px - x) ** 2 - (pz - z) ** 2))
                    pts.append((px, EY - dy - 0.02, pz))
                self.face_objs.append(S.tube("lid", pts, 0.05, k))

    def trim(self):
        S = self.S
        self.body.append(S.star("star", (0, -0.15, 2.72), 0.42, 0.18, 0.16, S.clay("accent")))

    def head_top(self):
        return (0, 0.05, 2.35)


class Glimmr(Creature):
    """A wisp of a sprite that hums when happy. No feet: it floats."""
    body_c = (0, 0, 2.0); body_r = (1.28, 1.25, 1.28)
    iris = "#6d7fe0"
    eye_dx, eye_z = 0.48, 2.35
    cheek_dx, cheek_z = 0.92, 1.9
    mouth_z, mouth_w = 1.82, 0.28
    feet = False

    def build(self):
        S = self.S
        # a teardrop: a round head that tapers away into a wisp of a tail
        self.body.append(S.sphere("body", self.body_c, 1.0, S.clay("body"), scale=self.body_r))
        self.body.append(S.sphere("body2", (0, 0.05, 1.05), 0.88, S.clay("body"), scale=(1, 0.95, 1)))
        self.body.append(S.sphere("body3", (0.1, 0.1, 0.45), 0.5, S.clay("body")))
        self.body.append(S.sphere("body4", (0.25, 0.15, 0.12), 0.22, S.clay("body")))
        self.trim(); self.belly()

    def belly(self):
        S = self.S
        self.body.append(S.sphere("belly", (0, -0.62, 1.4), 1.0, S.clay("accent"), scale=(0.7, 0.55, 0.8)))

    def trim(self):
        S = self.S
        tuft = S.clay("accent")
        self.body.append(S.sphere("tuft", (0.05, 0, 3.25), 0.3, tuft, scale=(0.55, 0.55, 0.95), rot=(0, math.radians(18), 0)))
        self.body.append(S.sphere("tuft2", (0.38, 0, 3.4), 0.2, tuft, scale=(0.55, 0.55, 0.8), rot=(0, math.radians(40), 0)))
        for sx in (-1, 1):
            # little sparkle wings, growing out of the sides
            self.body.append(S.sphere("spark", (sx * 1.35, 0.15, 2.25), 0.36, tuft, scale=(0.55, 0.45, 0.85),
                                      rot=(0, sx * math.radians(-20), 0)))
            self.body.append(S.sphere("spark2", (sx * 1.35, 0.2, 1.62), 0.26, tuft, scale=(0.45, 0.4, 0.62),
                                      rot=(0, sx * math.radians(25), 0)))

    def neck(self):
        return (1.65, 1.15, 1.12)

    def head_top(self):
        # the tallest head in the valley: hats sit a little deeper so the
        # wizard's point still fits in the tile
        return (0, 0, 3.1)


SPECIES = {"blorb": Blorb, "snorbit": Snorbit, "flarn": Flarn, "twiggle": Twiggle,
           "puddlepop": Puddlepop, "zibbit": Zibbit, "glimmr": Glimmr}


# ===========================================================================
#  The wardrobe — built ON a creature, at its own head, eyes and neck
# ===========================================================================
def wear_head(S, c, kind):
    hx, hy, hz = c.head_top()
    base = hz - 0.22                         # sunk a little into the head
    P = []
    gold = S.fixed("gold", "#ffd863", rough=0.3, metallic=0.8)
    if kind == "tiara":
        P.append(S.torus("band", (hx, hy, base + 0.05), 0.72, 0.07, gold, rot=(math.radians(8), 0, 0)))
        for x in (-0.42, 0, 0.42):
            P.append(S.cone("pt", (hx + x, hy - 0.62, base + 0.35), 0.1, 0.42, gold, rot=(math.radians(-8), 0, 0)))
        P.append(S.sphere("gem", (hx, hy - 0.72, base + 0.32), 0.08, S.fixed("gem", "#ff8fd0", rough=0.15)))
    elif kind == "crown":
        P.append(S.cylinder("band", (hx, hy, base + 0.22), 0.72, 0.36, gold))
        for i in range(6):
            a = i / 6.0 * math.tau + math.pi / 2
            P.append(S.cone("pt", (hx + math.cos(a) * 0.66, hy + math.sin(a) * 0.66, base + 0.6), 0.14, 0.5, gold))
        for i, colr in enumerate(("#ff5d6c", "#6fdc8c", "#57c4ff")):
            a = math.pi * (0.25 + 0.25 * i) + math.pi        # across the front
            P.append(S.sphere("gem", (hx + math.cos(a) * 0.74, hy + math.sin(a) * 0.74, base + 0.22), 0.09,
                              S.fixed("gem" + colr, colr, rough=0.15)))
    elif kind == "partyhat":
        stripe = S.fixed("p1", "#ffd863", rough=0.5)
        P.append(S.cone("hat", (hx, hy, base + 0.65), 0.62, 1.3, S.fixed("p2", "#ff5d8f", rough=0.5)))
        for z in (0.28, 0.78):
            r = 0.62 * (1 - z / 1.3)
            P.append(S.cylinder("stripe", (hx, hy, base + z), r + 0.012, 0.16, stripe, scale=(1, 1, 1)))
        P.append(S.sphere("pom", (hx, hy, base + 1.35), 0.16, stripe))
    elif kind == "bow":
        pink, dark = S.fixed("bp", "#ff6ec7", rough=0.5), S.fixed("bd", "#e560ae", rough=0.5)
        bx = hx + 0.55
        for sx in (-1, 1):
            P.append(S.sphere("loop", (bx + sx * 0.36, hy - 0.1, base + 0.28), 0.34, pink, scale=(1, 0.55, 0.75)))
        P.append(S.sphere("knot", (bx, hy - 0.2, base + 0.26), 0.16, dark, scale=(1, 0.7, 1)))
    elif kind == "flowercrown":
        green = S.fixed("g", "#3fb469", rough=0.6)
        P.append(S.torus("vine", (hx, hy, base + 0.1), 0.78, 0.07, green, rot=(math.radians(10), 0, 0)))
        for i in range(7):
            a = math.pi * (0.9 + 1.2 * i / 6.0)
            colr = "#ff8fd0" if i % 2 == 0 else "#ffd863"
            P.append(S.sphere("flower", (hx + math.cos(a) * 0.8, hy + math.sin(a) * 0.8 * 0.98, base + 0.16 - math.sin(a) * 0.05),
                              0.13, S.fixed("f" + colr, colr, rough=0.5)))
    elif kind == "beanie":
        blue, white = S.fixed("bb", "#57c4ff", rough=0.75), S.fixed("bw", "#ffffff", rough=0.8)
        P.append(S.sphere("cap", (hx, hy, base + 0.05), 0.92, blue, scale=(1, 1, 0.8)))
        P.append(S.torus("brim", (hx, hy, base + 0.02), 0.86, 0.14, white))
        P.append(S.sphere("pom", (hx, hy, base + 0.86), 0.2, white))
    elif kind == "chef":
        white = S.fixed("cw", "#ffffff", rough=0.8)
        P.append(S.cylinder("band", (hx, hy, base + 0.15), 0.8, 0.3, S.fixed("cb", "#dfe3f0", rough=0.8)))
        P.append(S.sphere("puff", (hx, hy, base + 0.72), 0.95, white, scale=(1, 1, 0.62)))
        for sx in (-1, 1):
            P.append(S.sphere("puff2", (hx + sx * 0.45, hy, base + 0.82), 0.55, white))
    elif kind == "helmet":
        yel = S.fixed("hy", "#ffd166", rough=0.35)
        P.append(S.sphere("dome", (hx, hy, base), 0.95, yel, scale=(1, 1, 0.72)))
        P.append(S.torus("rim", (hx, hy, base + 0.02), 0.9, 0.08, S.fixed("hr", "#d9a300", rough=0.4)))
        P.append(S.cylinder("lamp", (hx, hy - 0.85, base + 0.32), 0.17, 0.2, S.fixed("lamp", "#ffffff", rough=0.2, emit=1.2),
                            rot=(math.radians(90), 0, 0)))
    elif kind == "cowboy":
        tan, dark = S.fixed("ct", "#c99a6b", rough=0.75), S.fixed("cd", "#7a4a1f", rough=0.7)
        P.append(S.cylinder("brim", (hx, hy, base + 0.02), 1.35, 0.07, tan, scale=(1, 0.85, 1)))
        P.append(S.sphere("crown", (hx, hy, base + 0.3), 0.72, tan, scale=(1, 0.9, 0.8)))
        P.append(S.torus("band", (hx, hy, base + 0.12), 0.7, 0.06, dark))
    elif kind == "tophat":
        black = S.fixed("tk", "#2b2440", rough=0.45)
        P.append(S.cylinder("brim", (hx, hy, base + 0.02), 1.05, 0.07, black))
        P.append(S.cylinder("top", (hx, hy, base + 0.55), 0.68, 1.05, black))
        P.append(S.cylinder("band", (hx, hy, base + 0.2), 0.7, 0.2, S.fixed("tr", "#ff5d6c", rough=0.5)))
    elif kind == "bunnyears":
        white, pink = S.fixed("bw", "#ffffff", rough=0.7), S.fixed("bp", "#ffb3d9", rough=0.6)
        P.append(S.torus("band", (hx, hy, base + 0.05), 0.75, 0.05, S.fixed("bo", "#7a5a6a", rough=0.6),
                         rot=(math.radians(8), 0, 0)))
        for sx in (-1, 1):
            rot = (0, sx * math.radians(14), 0)
            P.append(S.sphere("ear", (hx + sx * 0.5, hy, base + 0.7), 0.24, white, scale=(1, 0.7, 2.6), rot=rot))
            P.append(S.sphere("earin", (hx + sx * 0.5, hy - 0.12, base + 0.7), 0.24, pink, scale=(0.5, 0.5, 2.0), rot=rot))
    elif kind == "pirate":
        black = S.fixed("pk", "#2b2440", rough=0.55)
        P.append(S.sphere("hat", (hx, hy, base + 0.1), 1.05, black, scale=(1.25, 0.85, 0.42)))
        P.append(S.sphere("crown", (hx, hy, base + 0.35), 0.62, black, scale=(1.1, 0.85, 0.55)))
        P.append(S.sphere("skull", (hx, hy - 0.78, base + 0.38), 0.15, S.fixed("pw", "#ffffff", rough=0.5), scale=(1, 0.5, 1)))
    elif kind == "wizard":
        purple = S.fixed("wp", "#5b3fa8", rough=0.6)
        P.append(S.cylinder("brim", (hx, hy, base + 0.02), 1.15, 0.08, purple))
        P.append(S.cone("cone", (hx, hy, base + 0.72), 0.72, 1.45, purple, rot=(0, math.radians(-14), 0)))
        P.append(S.star("star", (hx - 0.25, hy - 0.6, base + 0.72), 0.17, 0.07, 0.06, S.fixed("ws", "#ffd863", rough=0.3, emit=0.4)))
    elif kind == "princess":
        pink, ice = S.fixed("tp", "#ff8fd0", rough=0.3, metallic=0.4), S.fixed("ti", "#9bf6ff", rough=0.1)
        P.append(S.torus("band", (hx, hy, base + 0.05), 0.74, 0.07, pink, rot=(math.radians(8), 0, 0)))
        for i, x in enumerate((-0.5, 0, 0.5)):
            h = 0.55 if i == 1 else 0.38
            P.append(S.cone("pt", (hx + x, hy - 0.6, base + 0.1 + h / 2), 0.1, h, pink, rot=(math.radians(-8), 0, 0)))
            P.append(S.sphere("gem", (hx + x, hy - 0.66, base + 0.08), 0.09, ice))
    elif kind == "halo":
        P.append(S.torus("halo", (hx, hy + 0.1, hz + 0.45), 0.62, 0.07,
                         S.fixed("hg", "#ffe27a", rough=0.25, metallic=0.6, emit=0.5), rot=(math.radians(12), 0, 0)))
    elif kind == "starcrown":
        P.append(S.cylinder("band", (hx, hy, base + 0.16), 0.72, 0.26, gold))
        for i, a in enumerate((math.pi * 1.2, math.pi * 1.5, math.pi * 1.8)):
            P.append(S.star("st", (hx + math.cos(a) * 0.7, hy + math.sin(a) * 0.7, base + 0.5), 0.22, 0.1, 0.08,
                            S.fixed("ss", "#ffe27a", rough=0.25, emit=0.6), rot=(0, 0, a - math.pi * 1.5)))
    elif kind == "santahat":
        red, white = S.fixed("sr", "#e8384f", rough=0.7), S.fixed("sw", "#ffffff", rough=0.85)
        P.append(S.torus("brim", (hx, hy, base + 0.05), 0.85, 0.18, white))
        P.append(S.cone("cone", (hx, hy, base + 0.62), 0.82, 1.15, red, rot=(0, math.radians(-25), 0)))
        P.append(S.sphere("pom", (hx - 0.47, hy, base + 1.02), 0.2, white))
    elif kind == "pumpkinhat":
        orange = S.fixed("po", "#ff8c1a", rough=0.6)
        for i in range(6):
            a = i / 6.0 * math.tau
            P.append(S.sphere("seg", (hx + math.cos(a) * 0.3, hy + math.sin(a) * 0.3, base + 0.28), 0.62, orange,
                              scale=(1, 1, 0.8)))
        P.append(S.cylinder("stem", (hx, hy, base + 0.85), 0.1, 0.32, S.fixed("pg", "#3fb469", rough=0.7),
                            rot=(0, math.radians(15), 0)))
    return P


def wear_face(S, c, style, colour, lens=None):
    P = []
    m = S.fixed("frame", colour, rough=0.35, metallic=0.2)
    eyes = c.eye_anchor()
    inner = []
    for (x, y, z, r) in eyes:
        R = r * 1.25
        P.append(S.torus("lens", (x, y - 0.14, z), R, 0.045, m, rot=(math.radians(90), 0, 0)))
        if style == "shades":
            P.append(S.cylinder("dark", (x, y - 0.12, z), R, 0.03, S.fixed("lens", lens, rough=0.15),
                                rot=(math.radians(90), 0, 0)))
        if style == "star":
            P.append(S.star("st", (x + (R + 0.05) * (1 if x > 0 else -1), y - 0.18, z + R * 0.75), 0.13, 0.06, 0.05, m))
        inner.append((x - (R + 0.02) * (1 if x > 0 else -1), y - 0.14, z))
        # an arm back to the side of the head
        side = 1 if x > 0 else -1
        P.append(S.tube("arm", [(x + side * R, y - 0.14, z), (x + side * (R + 0.35), y + 0.35, z + 0.02),
                                (side * (c.body_r[0] * 0.98), c.body_c[1] + 0.1, z + 0.05)], 0.035, m))
    P.append(S.tube("bridge", [inner[0], ((inner[0][0] + inner[1][0]) / 2, inner[0][1] - 0.02, inner[0][2] + 0.03), inner[1]], 0.04, m))
    return P


def wear_neck(S, c, style, colour, dark):
    P = []
    z, rx, ry = c.neck()
    cx, cy = c.body_c[0], c.body_c[1]
    if style == "scarf":
        m, d = S.fixed("sc", colour, rough=0.8), S.fixed("sd", dark, rough=0.8)
        P.append(S.torus("wrap", (cx, cy, z), (rx + ry) / 2 + 0.02, 0.17, m, scale=(rx / ((rx + ry) / 2), ry / ((rx + ry) / 2), 1)))
        P.append(S.torus("wrap2", (cx, cy, z - 0.2), (rx + ry) / 2 + 0.06, 0.14, d, scale=(rx / ((rx + ry) / 2), ry / ((rx + ry) / 2), 1)))
        # a tail hanging down the left front
        x0 = cx - rx * 0.45
        P.append(S.tube("tail", [(x0, c.front(x0, z) - 0.1, z - 0.05), (x0 - 0.05, c.front(x0, z - 0.4) - 0.16, z - 0.45),
                                 (x0 + 0.05, c.front(x0, z - 0.8) - 0.2, z - 0.85)], 0.13, m))
        P.append(S.sphere("fringe", (x0 + 0.05, c.front(x0, z - 0.85) - 0.2, z - 0.95), 0.14, d, scale=(1, 0.6, 0.6)))
    elif style == "bowtie":
        m, d = S.fixed("bt", colour, rough=0.5), S.fixed("bd", dark, rough=0.5)
        y = c.front(cx, z) - 0.12
        for sx in (-1, 1):
            P.append(S.cone("wing", (cx + sx * 0.3, y, z), 0.22, 0.55, m, rot=(0, sx * math.radians(90), 0), scale=(1, 0.5, 1)))
        P.append(S.sphere("knot", (cx, y - 0.04, z), 0.13, d, scale=(1, 0.7, 1.1)))
    elif style == "pearls":
        m = S.fixed("pearl", colour, rough=0.15, spec=0.8)
        n = 15
        for i in range(n):
            a = math.pi + math.pi * i / (n - 1)          # the front half
            x, y = cx + math.cos(a) * (rx + 0.05), cy + math.sin(a) * (ry + 0.05)
            P.append(S.sphere("pearl", (x, y, z - 0.05 + 0.12 * abs(math.cos(a))), 0.085, m))
    elif style == "medal":
        rib = S.fixed("rib", dark, rough=0.7)
        P.append(S.torus("ribbon", (cx, cy, z), (rx + ry) / 2 + 0.02, 0.05, rib, scale=(rx / ((rx + ry) / 2), ry / ((rx + ry) / 2), 1)))
        y = c.front(cx, z - 0.45) - 0.1
        P.append(S.cylinder("disc", (cx, y, z - 0.45), 0.24, 0.06, S.fixed("md", colour, rough=0.25, metallic=0.8),
                            rot=(math.radians(90), 0, 0)))
        P.append(S.star("st", (cx, y - 0.05, z - 0.45), 0.13, 0.06, 0.03, S.fixed("ms", "#fff3c4", rough=0.3, emit=0.3)))
    return P


# id -> builder; kept in step with WEAR in games/craepets/pets.js
WEAR = {
    "tiara": lambda S, c: wear_head(S, c, "tiara"),
    "crown": lambda S, c: wear_head(S, c, "crown"),
    "partyhat": lambda S, c: wear_head(S, c, "partyhat"),
    "bow": lambda S, c: wear_head(S, c, "bow"),
    "flowercrown": lambda S, c: wear_head(S, c, "flowercrown"),
    "beanie": lambda S, c: wear_head(S, c, "beanie"),
    "chef": lambda S, c: wear_head(S, c, "chef"),
    "helmet": lambda S, c: wear_head(S, c, "helmet"),
    "cowboy": lambda S, c: wear_head(S, c, "cowboy"),
    "tophat": lambda S, c: wear_head(S, c, "tophat"),
    "bunnyears": lambda S, c: wear_head(S, c, "bunnyears"),
    "pirate": lambda S, c: wear_head(S, c, "pirate"),
    "wizard": lambda S, c: wear_head(S, c, "wizard"),
    "princess": lambda S, c: wear_head(S, c, "princess"),
    "halo": lambda S, c: wear_head(S, c, "halo"),
    "starcrown": lambda S, c: wear_head(S, c, "starcrown"),
    "santahat": lambda S, c: wear_head(S, c, "santahat"),
    "pumpkinhat": lambda S, c: wear_head(S, c, "pumpkinhat"),
    "glasses": lambda S, c: wear_face(S, c, "round", "#2b2440"),
    "sunglasses": lambda S, c: wear_face(S, c, "shades", "#111018", "#241f36"),
    "heartglasses": lambda S, c: wear_face(S, c, "round", "#ff5d8f"),
    "starglasses": lambda S, c: wear_face(S, c, "star", "#ffd166"),
    "scarf": lambda S, c: wear_neck(S, c, "scarf", "#ff5d6c", "#b8323f"),
    "bluescarf": lambda S, c: wear_neck(S, c, "scarf", "#57c4ff", "#2f9fe0"),
    "bowtie": lambda S, c: wear_neck(S, c, "bowtie", "#8a5cff", "#5b3fa8"),
    "pearls": lambda S, c: wear_neck(S, c, "pearls", "#fff6f0", "#c9c0d6"),
    "medal": lambda S, c: wear_neck(S, c, "medal", "#ffd166", "#ff5d6c"),
}


# ===========================================================================
#  The egg and the petpets
# ===========================================================================
def build_egg(S, crack):
    c, rad = (0, 0, 1.75), (1.32, 1.28, 1.72)
    objs = [S.sphere("egg", c, 1.0, S.clay("body"), scale=rad)]
    spots = [(-0.55, 2.4, 0.2), (0.6, 2.1, 0.25), (-0.15, 1.35, 0.28), (0.75, 1.1, 0.18), (-0.8, 1.6, 0.16), (0.1, 2.9, 0.15)]
    for (x, z, r) in spots:
        y = ell_front_y(c, rad, x, z)
        objs.append(S.sphere("spot", (x, y + r * 0.35, z), r, S.clay("accent"), scale=(1, 0.6, 1)))
    if crack:
        dark = S.fixed("crack", "#3a2036", rough=0.6)
        zig = [(-0.05, 2.75), (0.18, 2.5), (-0.1, 2.25), (0.22, 2.0), (0.0, 1.7)]
        if crack >= 2: zig = [(-0.35, 3.0)] + zig + [(0.35, 1.45), (0.1, 1.2)]
        pts = [(x, ell_front_y(c, rad, x, z) - 0.02, z) for (x, z) in zig]
        objs.append(S.tube("crack", pts, 0.05 if crack >= 2 else 0.035, dark))
        if crack >= 2:
            light = S.fixed("gap", "#ffffff", rough=0.4, emit=0.8)
            for (x, z) in ((0.05, 2.38), (0.05, 1.85)):
                objs.append(S.sphere("gap", (x, ell_front_y(c, rad, x, z) - 0.03, z), 0.07, light, scale=(1, 0.5, 1.4)))
    S.body_objs = objs
    return objs


def build_petpet(S, pid):
    """Each petpet in its own colours, standing in an 8 x 8 cell frame."""
    def clay(hexcol, **kw): return S.fixed("pp-" + hexcol, hexcol, rough=0.8, spec=0.2, sss=0.3, sheen=0.3, sheen_rough=0.6, **kw)
    def coat(obj, hexcol, length, **kw):
        kw.setdefault("radius", 0.003); kw.setdefault("density", 160)
        S.fur(obj, S.fur_mat("fixed", srgb(hexcol)), length, **kw)
    eyeW = S.eye_white("fixed")
    eyeK = S.eye_pupil("fixed")
    def face(c, rad, dx, z, r=0.1, sleepy=False):
        for sx in (-1, 1):
            x = c[0] + sx * dx
            y = ell_front_y(c, rad, x, z)
            S.sphere("eye", (x, y + 0.01, z), r, eyeW, scale=(1, 0.5, 1.1))
            S.sphere("pupil", (x, y - r * 0.5, z + 0.01), r * 0.55, eyeK, scale=(1, 0.5, 1.1))
    if pid == "duckling":
        yel, orange = clay("#ffe066"), clay("#ff9f45")
        coat(S.sphere("body", (0, 0, 0.55), 0.55, yel, scale=(1, 1.1, 0.95)), "#ffe066", 0.07)
        coat(S.sphere("head", (0, -0.15, 1.25), 0.42, yel), "#ffe066", 0.04, radius=0.0025)
        face((0, -0.15, 1.25), (0.42, 0.42, 0.42), 0.17, 1.32, 0.09)
        S.cone("beak", (0, -0.62, 1.15), 0.12, 0.28, orange, rot=(math.radians(-90), 0, 0))
        S.sphere("wing", (0.5, 0.05, 0.6), 0.22, yel, scale=(0.5, 1, 0.7))
        for sx in (-1, 1): S.sphere("foot", (sx * 0.25, -0.2, 0.06), 0.16, orange, scale=(1, 1.4, 0.4))
    elif pid == "snail":
        tan, pink = clay("#c99a6b"), clay("#ff8fd0")
        S.sphere("foot", (0.1, 0, 0.22), 0.55, tan, scale=(1.3, 0.7, 0.4))
        S.sphere("head", (-0.55, -0.1, 0.55), 0.3, tan)
        S.sphere("shell", (0.3, 0, 0.75), 0.55, pink, scale=(1, 0.8, 1))
        S.torus("swirl", (0.3, -0.42, 0.75), 0.3, 0.06, clay("#e560ae"), rot=(math.radians(90), 0, 0))
        for sx in (-1, 1):
            S.tube("stalk", [(-0.6 + sx * 0.12, -0.1, 0.7), (-0.7 + sx * 0.2, -0.15, 1.15)], 0.04, tan)
            S.sphere("eye", (-0.7 + sx * 0.2, -0.15, 1.18), 0.09, eyeW)
            S.sphere("pupil", (-0.7 + sx * 0.2, -0.22, 1.18), 0.05, eyeK)
    elif pid == "blobbin":
        g = clay("#6fdc8c")
        S.sphere("body", (0, 0, 0.72), 0.72, g, scale=(1, 0.95, 1))
        face((0, 0, 0.72), (0.72, 0.68, 0.72), 0.28, 0.9, 0.12)
        S.tube("smile", [(-0.2, ell_front_y((0, 0, 0.72), (0.72, 0.68, 0.72), -0.2, 0.5) - 0.02, 0.5),
                         (0, ell_front_y((0, 0, 0.72), (0.72, 0.68, 0.72), 0, 0.42) - 0.02, 0.42),
                         (0.2, ell_front_y((0, 0, 0.72), (0.72, 0.68, 0.72), 0.2, 0.5) - 0.02, 0.5)], 0.03, eyeK)
    elif pid == "moth":
        purple, gold = clay("#a97dff"), clay("#ffd863")
        coat(S.sphere("body", (0, 0, 0.75), 0.22, clay("#8a5cff"), scale=(1, 1, 2.2)), "#8a5cff", 0.05)
        for sx in (-1, 1):
            S.sphere("wing", (sx * 0.55, 0.05, 1.05), 0.48, purple, scale=(1, 0.2, 0.85))
            S.sphere("wing2", (sx * 0.45, 0.05, 0.45), 0.34, purple, scale=(1, 0.2, 0.75))
            S.sphere("dot", (sx * 0.55, -0.06, 1.05), 0.16, gold, scale=(1, 0.3, 1))
            S.tube("ant", [(sx * 0.08, 0, 1.2), (sx * 0.3, -0.1, 1.55)], 0.025, eyeK)
        face((0, 0, 1.0), (0.22, 0.22, 0.4), 0.09, 1.1, 0.06)
    elif pid == "kit":
        fur, cream = clay("#f4b16f"), clay("#ffd7db")
        coat(S.sphere("body", (0, 0.1, 0.5), 0.5, fur, scale=(1, 1.2, 0.9)), "#f4b16f", 0.07)
        coat(S.sphere("head", (0, -0.25, 1.1), 0.45, fur), "#f4b16f", 0.03, radius=0.0025)
        for sx in (-1, 1):
            S.cone("ear", (sx * 0.28, -0.2, 1.55), 0.15, 0.32, fur, rot=(0, sx * math.radians(15), 0))
        face((0, -0.25, 1.1), (0.45, 0.45, 0.45), 0.18, 1.15, 0.09)
        S.sphere("muzzle", (0, -0.62, 0.98), 0.14, cream, scale=(1.3, 0.5, 0.8))
        S.torus("tail", (0.55, 0.45, 0.45), 0.3, 0.08, fur, rot=(math.radians(90), 0, 0))
    elif pid == "hedge":
        brown, dark, cream = clay("#8a6a4a"), clay("#5a4030"), clay("#f4d3b0")
        coat(S.sphere("body", (0.1, 0, 0.6), 0.62, dark, scale=(1.05, 0.95, 0.85)), "#5a4030", 0.06)
        for i in range(14):
            a = math.pi * (0.1 + 0.8 * i / 13.0); r = 0.62
            S.cone("spike", (0.1 + math.cos(a) * r * 0.9, 0, 0.6 + math.sin(a) * r * 0.8), 0.07, 0.35, dark,
                   rot=(0, math.pi / 2 - a, 0))
        coat(S.sphere("face", (-0.45, -0.2, 0.5), 0.36, cream, scale=(1.2, 0.9, 0.85)), "#f4d3b0", 0.035)
        S.sphere("nose", (-0.85, -0.25, 0.45), 0.08, eyeK)
        S.sphere("eye", (-0.5, -0.5, 0.62), 0.06, eyeK)
    elif pid == "wisp":
        pale = clay("#dfe6ff", emit=0.25)
        S.metaball("body", [(0, 0, 1.0, 0.85), (0, 0, 0.55, 0.62), (0.15, 0, 0.25, 0.4), (-0.2, 0, 0.2, 0.35)], pale)
        face((0, 0, 1.0), (0.62, 0.62, 0.62), 0.22, 1.05, 0.1)
    elif pid == "starling":
        gold = clay("#ffe27a", emit=0.35)
        S.star("star", (0, 0, 0.85), 0.85, 0.42, 0.28, gold)
        face((0, -0.14, 0.75), (0.42, 0.01, 0.42), 0.18, 0.8, 0.09)
    S.body_objs = list(S.objs)


# ===========================================================================
#  Sheets and the manifest
# ===========================================================================
SHADOW = 0.55                 # how dark the floor shadow is kept in the sheets


def soften_shadow(lit_path, id_path):
    """The floor shadow is the only thing in a lit tile that the ID pass
    does not see (the floor is hidden there), so scale the alpha of those
    pixels: a toy-photo shadow, not a black pool. Returns a PIL image."""
    from PIL import Image
    im = Image.open(lit_path).convert("RGBA")
    if not id_path or not os.path.exists(id_path): return im
    idm = Image.open(id_path).convert("RGBA")
    from PIL import ImageChops
    w, h = im.size
    a = im.getchannel("A"); ma = idm.getchannel("A")
    # the shadow also fades out towards the sides and bottom of the tile, so
    # it never ends in a hard line where the tile does
    fade = Image.new("L", (w, h), 255); fp = fade.load()
    ex, ey = int(w * 0.16), int(h * 0.06)
    for y in range(h):
        fy = min(1.0, (h - 1 - y) / float(ey)) if y > h - 1 - ey else 1.0
        for x in range(w):
            fx = min(1.0, x / float(ex), (w - 1 - x) / float(ex))
            f = fx * fy
            fp[x, y] = int(round(255 * f * f * (3 - 2 * f)))    # smoothstep
    # alpha' = alpha * (mask + (1 - mask) * SHADOW * fade)
    inv = ImageChops.invert(ma)
    sh = ImageChops.multiply(inv, fade).point(lambda v: int(round(v * SHADOW)))
    keep = ImageChops.add(ma, sh)
    im.putalpha(ImageChops.multiply(a, keep))
    return im


QUALITY = 92                  # WebP quality for the lit tiles (the masks are lossless)


def pack_sheet(tiles, tile_w, tile_h, cols, out_base, ids=None):
    """Paste rendered tile PNGs into sheets; returns {name: [col,row]}.
    The lit tiles go to <out_base>.webp (lossy: fur is all fine detail and
    a PNG of it is four times the size for no visible gain) and the
    colour-ID masks, if any, to <out_base>-id.webp (lossless, so the tint
    reads exact classes). `ids` maps a tile name to its ID-pass PNG (used
    to soften the floor shadow); tiles named '<x>-id' find their own."""
    from PIL import Image
    ids = dict(ids or {})
    paths = dict(tiles)
    where = {}
    groups = [("", [t for t in tiles if not t[0].endswith("-id")]),
              ("-id", [t for t in tiles if t[0].endswith("-id")])]
    for suffix, group in groups:
        if not group: continue
        rows = (len(group) + cols - 1) // cols
        sheet = Image.new("RGBA", (cols * tile_w, rows * tile_h), (0, 0, 0, 0))
        for i, (name, path) in enumerate(group):
            if name.endswith("-id") or name.startswith("wear-"):
                im = Image.open(path).convert("RGBA")
            else:
                im = soften_shadow(path, ids.get(name) or paths.get(name + "-id"))
            c, r = i % cols, i // cols
            sheet.paste(im, (c * tile_w, r * tile_h))
            where[name] = [c, r]
        if suffix:
            sheet.save(out_base + suffix + ".webp", "WEBP", lossless=True, method=6)
        else:
            sheet.save(out_base + ".webp", "WEBP", quality=QUALITY, method=6)
    return where


def sheet_entry(base, tile_wh, where, masks=True):
    e = {"file": base + ".webp", "tile": list(tile_wh), "tiles": where}
    if masks: e["idfile"] = base + "-id.webp"
    return e


def sheet_size(out_base):
    tot = 0
    for f in (out_base + ".webp", out_base + "-id.webp"):
        if os.path.exists(f): tot += os.path.getsize(f)
    return f"{tot // 1024} KB"


def write_manifest(manifest, path):
    with open(path, "w") as f:
        f.write("/* GENERATED by tools/craepets-art/render.py — do not edit.\n"
                "   Where every clay sprite lives in the sheets in this folder. */\n")
        f.write("window.CPArt = " + json.dumps(manifest, indent=1, sort_keys=True) + ";\n")


def load_manifest(path):
    if not os.path.exists(path): return None
    txt = open(path).read()
    i = txt.find("window.CPArt = ")
    if i < 0: return None
    try: return json.loads(txt[i + len("window.CPArt = "):].rstrip().rstrip(";"))
    except ValueError: return None


# ===========================================================================
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--species", help="comma list of species ids (default: all)")
    ap.add_argument("--only", help="comma list of: species,egg,petpets (default: all)")
    ap.add_argument("--wear", help="comma list of wear ids to render (default: all); 'none' skips wear")
    ap.add_argument("--frames", help="comma list of frames to render (default: all)")
    ap.add_argument("--samples", type=int, default=64)
    ap.add_argument("--out", default=OUT_DIR)
    ap.add_argument("--tmp", default=os.path.join(HERE, ".tiles"))
    ap.add_argument("--force", action="store_true", help="re-render sheets that already exist")
    ap.add_argument("--repack", action="store_true", help="reuse tiles already rendered into --tmp; only render what is missing")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True); os.makedirs(args.tmp, exist_ok=True)
    only = set((args.only or "species,egg,petpets").split(","))
    species = (args.species or ",".join(SPECIES)).split(",")
    wear_ids = list(WEAR) if not args.wear else ([] if args.wear == "none" else args.wear.split(","))
    manifest_path = os.path.join(args.out, "manifest.js")
    manifest = load_manifest(manifest_path) or {}
    manifest.update({"cell": CELL, "frame": [FRAME_W, FRAME_H], "petpetFrame": [PP_W, PP_H], "frames": FRAMES})
    manifest.setdefault("sheets", {})
    TW, TH = FRAME_W * CELL, FRAME_H * CELL
    t0 = time.time()

    def tile(path_name):
        return os.path.join(args.tmp, path_name + ".png")

    def have(*paths):
        """--repack: reuse tiles already rendered into --tmp."""
        return args.repack and all(os.path.exists(p) for p in paths)

    if "species" in only:
        for sid in species:
            base = os.path.join(args.out, sid)
            if os.path.exists(base + ".webp") and not args.force and sid in manifest["sheets"]:
                print("skip", sid, "(exists)"); continue
            tiles = []
            S = c = None                      # ONE scene per species: the coat must not change between frames
            def creature(frame):
                nonlocal S, c
                if S is None:
                    S = Scene(FRAME_W, FRAME_H, args.samples); c = SPECIES[sid](S, frame)
                else:
                    c.set_frame(frame)
                return S, c
            for frame in (args.frames.split(",") if args.frames else FRAMES):
                lit, idp = tile(f"{sid}-{frame}"), tile(f"{sid}-{frame}-id")
                if not have(lit, idp):
                    S, c = creature(frame)
                    S.render(lit); S.render_id(idp)
                    print(f"  {sid} {frame}  ({time.time() - t0:.0f}s)")
                tiles += [(frame, lit), (frame + "-id", idp)]
            todo = [w for w in wear_ids if not have(tile(f"{sid}-wear-{w}"))]
            if todo:
                S, c = creature("idle")
                S.sc.cycles.samples = max(24, args.samples * 3 // 4)
                S.set_holdout(S.body_objs, True)
                S.floor.hide_render = True        # the creature's own tile has the floor shadow
                # the coat is in the creature's own tile too: a holdout body
                # still renders its hair, and white strands over a hat would
                # show on a coloured pet, so the wardrobe is fitted bare
                for o in S.body_objs:
                    for mod in o.modifiers:
                        if mod.type == "PARTICLE_SYSTEM": mod.show_render = False
                for wid in todo:
                    parts = WEAR[wid](S, c)
                    S.render(tile(f"{sid}-wear-{wid}"))
                    S.remove(parts)
                    print(f"  {sid} wear {wid}  ({time.time() - t0:.0f}s)")
            tiles += [("wear-" + wid, tile(f"{sid}-wear-{wid}")) for wid in wear_ids]
            where = pack_sheet(tiles, TW, TH, 8, base)
            manifest["sheets"][sid] = sheet_entry(sid, (TW, TH), where)
            write_manifest(manifest, manifest_path)
            print("wrote", base + ".webp", sheet_size(base))

    if "egg" in only:
        base = os.path.join(args.out, "egg")
        if os.path.exists(base + ".webp") and not args.force and "egg" in manifest["sheets"]:
            print("skip egg (exists)")
        else:
            tiles = []
            for crack in (0, 1, 2):
                lit, idp = tile(f"egg-{crack}"), tile(f"egg-{crack}-id")
                if not have(lit, idp):
                    S = Scene(FRAME_W, FRAME_H, args.samples)
                    build_egg(S, crack)
                    S.render(lit); S.render_id(idp)
                    print(f"  egg {crack}  ({time.time() - t0:.0f}s)")
                tiles += [(f"crack{crack}", lit), (f"crack{crack}-id", idp)]
            where = pack_sheet(tiles, TW, TH, 6, base)
            manifest["sheets"]["egg"] = sheet_entry("egg", (TW, TH), where)
            write_manifest(manifest, manifest_path)
            print("wrote", base + ".webp", sheet_size(base))

    if "petpets" in only:
        base = os.path.join(args.out, "petpets")
        if os.path.exists(base + ".webp") and not args.force and "petpets" in manifest["sheets"]:
            print("skip petpets (exists)")
        else:
            ids = ["duckling", "snail", "blobbin", "moth", "kit", "hedge", "wisp", "starling"]
            tiles, masks = [], {}
            for pid in ids:
                lit, masks[pid] = tile(f"pp-{pid}"), tile(f"pp-{pid}-id")
                if not have(lit, masks[pid]):
                    S = Scene(PP_W, PP_H, args.samples)
                    build_petpet(S, pid)
                    S.render(lit)
                    # an ID pass just to know where the petpet is (for the shadow)
                    S.render_id(masks[pid])
                    print(f"  petpet {pid}  ({time.time() - t0:.0f}s)")
                tiles.append((pid, lit))
            where = pack_sheet(tiles, PP_W * CELL, PP_H * CELL, 8, base, masks)
            manifest["sheets"]["petpets"] = sheet_entry("petpets", (PP_W * CELL, PP_H * CELL), where, masks=False)
            write_manifest(manifest, manifest_path)
            print("wrote", base + ".webp", sheet_size(base))

    print(f"done in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
