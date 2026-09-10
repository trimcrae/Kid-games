"""Photographic finish pass: materials, lighting, camera and render settings.

Executed in build.py's Blender namespace after every room, yard and light
exists. It rebuilds materials in place by name, so the geometry modules stay
untouched and the browser exporter keeps reading each material's
``diffuse_color``. Colours and finishes follow the homeowner's reference
photographs: the living room seen from the upper landing, the stairs down
into the family room, the kitchen, Cory's bedroom and the basement play
area. The photographs stay private; only colour and finish observations are
encoded here, as procedural shaders with no image textures.

What the photographs establish about surfaces and light:

- Oak strip floor: warm honey colour with darker streaks, satin polyurethane
  sheen that reflects the lamps and windows softly.
- Walls: matte eggshell paint, pale sage downstairs, butter cream in the
  dining area, light warm grey upstairs.
- Kitchen: semi-gloss white raised-panel doors, glossy white subway tile with
  grey grout, grey-veined white laminate counters, brushed stainless with
  soft horizontal streaks, warm recessed cans and an under-cabinet strip.
- Carpet: plush beige (family room and stairs) and light grey (Cory's rug)
  with the soft sheen of pile, not a flat matte.
- Basement: white-painted concrete block with visible mortar lines, dark
  stained joists overhead, tan laminate planks underfoot.
- Light: daylight arrives through the windows as soft sky light rather than
  hard sun patches; the lamps glow warm through their linen shades; strings
  of fairy lights run along the top of the living-room walls.
"""

# ---------------------------------------------------------------- helpers

def _lin(r, g, b):
    return (r, g, b, 1)


def _scaled(color, k):
    return tuple(min(1, c * k) for c in color)


def _principled(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs['Surface'])
    return nt, bsdf, out


def _world_vector(nt, stretch=(1, 1, 1), jitter=0.0, object_space=False):
    """World-space texture coordinates; ``jitter`` offsets them per object so
    repeated boards and tiles each get their own grain. Polished timber can
    follow its local manufactured axes when the whole furniture asset rotates.
    """
    geo = nt.nodes.new('ShaderNodeTexCoord' if object_space else 'ShaderNodeNewGeometry')
    vec = geo.outputs['Object' if object_space else 'Position']
    if jitter:
        info = nt.nodes.new('ShaderNodeObjectInfo')
        combine = nt.nodes.new('ShaderNodeCombineXYZ')
        for i in range(3):
            nt.links.new(info.outputs['Random'], combine.inputs[i])
        mult = nt.nodes.new('ShaderNodeVectorMath')
        mult.operation = 'MULTIPLY'
        mult.inputs[1].default_value = (jitter, jitter * 2.3, jitter * 3.1)
        nt.links.new(combine.outputs[0], mult.inputs[0])
        add = nt.nodes.new('ShaderNodeVectorMath')
        add.operation = 'ADD'
        nt.links.new(vec, add.inputs[0])
        nt.links.new(mult.outputs[0], add.inputs[1])
        vec = add.outputs[0]
    if tuple(stretch) != (1, 1, 1):
        m = nt.nodes.new('ShaderNodeVectorMath')
        m.operation = 'MULTIPLY'
        m.inputs[1].default_value = stretch
        nt.links.new(vec, m.inputs[0])
        vec = m.outputs[0]
    return vec


def _noise(nt, vec, scale, detail=4, roughness=.5, distortion=0):
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = roughness
    n.inputs['Distortion'].default_value = distortion
    nt.links.new(vec, n.inputs['Vector'])
    return n.outputs['Fac']


def _ramp(nt, fac, c0, c1, p0=.25, p1=.75):
    r = nt.nodes.new('ShaderNodeValToRGB')
    r.color_ramp.elements[0].position = p0
    r.color_ramp.elements[0].color = _lin(*c0)
    r.color_ramp.elements[1].position = p1
    r.color_ramp.elements[1].color = _lin(*c1)
    nt.links.new(fac, r.inputs[0])
    return r.outputs['Color']


def _range(nt, fac, lo, hi):
    m = nt.nodes.new('ShaderNodeMapRange')
    m.inputs['To Min'].default_value = lo
    m.inputs['To Max'].default_value = hi
    nt.links.new(fac, m.inputs['Value'])
    return m.outputs['Result']


def _bump(nt, bsdf, fac, strength, distance):
    b = nt.nodes.new('ShaderNodeBump')
    b.inputs['Strength'].default_value = strength
    b.inputs['Distance'].default_value = distance
    nt.links.new(fac, b.inputs['Height'])
    nt.links.new(b.outputs[0], bsdf.inputs['Normal'])
    return b


def _mix_fac(nt, a, b, t):
    m = nt.nodes.new('ShaderNodeMath')
    m.operation = 'MULTIPLY_ADD'  # a*(1-t) + b*t  ==  (b-a)*t + a  ; done in two nodes
    d = nt.nodes.new('ShaderNodeMath')
    d.operation = 'SUBTRACT'
    nt.links.new(b, d.inputs[0])
    nt.links.new(a, d.inputs[1])
    nt.links.new(d.outputs[0], m.inputs[0])
    m.inputs[1].default_value = t
    nt.links.new(a, m.inputs[2])
    return m.outputs[0]


def _mat(name):
    mat = bpy.data.materials.get(name)
    if mat is None:
        raise KeyError('photoreal.py expects material: ' + name)
    return mat


# ---------------------------------------------------------------- shaders

def wood(mat, light, dark, along='x', scale=1.0, rough=.30, coat=.35, jitter=3.0):
    """Planed timber: irregular long fibres, restrained pores and a varnish coat.

    H51.008's narrow oak strips have uneven streaks rather than repeated dark
    sine bands. Keep the named colours while softening that procedural pattern.
    """
    nt, bsdf, _ = _principled(mat)
    polished = coat > 0
    stretch = {'x': (.20, 18, 18), 'y': (18, .20, 18), 'z': (18, 18, .20)}[along]
    # World-X grain degenerates into speckles on furniture facing world X.
    # Use the local timber axes for varnished boards/cabinets, preserving
    # metre-scale grain and per-object phase through the parent rotation.
    vec = _world_vector(nt, tuple(s * scale for s in stretch), jitter, polished)
    grain = _noise(nt, vec, 2.2, 5, .6, .35)
    fibres = _noise(nt, vec, 6.5, 3, .55, .18)
    fac = _mix_fac(nt, grain, fibres, .18)
    mid = tuple(d * .45 + l * .55 for d, l in zip(dark, light))
    if polished:
        # Reduce contrast around the same colour midpoint: indoor varnish
        # should not look abraded or white-flecked at shelf edges.
        centre = tuple((a + b) / 2 for a, b in zip(mid, light))
        low = tuple(c + (a-c) * .35 for a, c in zip(mid, centre))
        high = tuple(c + (b-c) * .35 for b, c in zip(light, centre))
    else:
        low, high = mid, light
    nt.links.new(_ramp(nt, fac, low, high, .3, .8), bsdf.inputs['Base Color'])
    fine = _noise(nt, _world_vector(nt, (40, 40, 40), jitter, polished), 1, 2, .5)
    variation = .025 if polished else .07
    nt.links.new(_range(nt, fine, rough - variation, rough + variation), bsdf.inputs['Roughness'])
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Coat Roughness'].default_value = .24 if polished else .12
    bsdf.inputs['Specular IOR Level'].default_value = .45
    _bump(nt, bsdf, fibres, .015 if polished else .055, .00015 if polished else .0005)
    mat.diffuse_color = _lin(*[(a + b) / 2 for a, b in zip(light, dark)])
    return mat


def paint(mat, color, rough=.58, bump=.05, coat=0.0):
    """Eggshell wall paint: matte with faint roller texture."""
    nt, bsdf, _ = _principled(mat)
    bsdf.inputs['Base Color'].default_value = _lin(*color)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Specular IOR Level'].default_value = .35
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Coat Roughness'].default_value = .25
    fine = _noise(nt, _world_vector(nt, (1, 1, 1)), 140, 3, .55)
    _bump(nt, bsdf, fine, bump, .001)
    mat.diffuse_color = _lin(*color)
    return mat


def enamel(mat, color, rough=.3, coat=.25):
    """Semi-gloss trim and cabinet paint."""
    return paint(mat, color, rough, .03, coat)


def blocks(mat, color, width=.406, height=.203):
    """Painted concrete block wall: mortar lines pressed into eggshell paint."""
    nt, bsdf, _ = _principled(mat)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    along = nt.nodes.new('ShaderNodeMath')
    along.operation = 'ADD'
    nt.links.new(sep.outputs['X'], along.inputs[0])
    nt.links.new(sep.outputs['Y'], along.inputs[1])
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(along.outputs[0], comb.inputs['X'])
    nt.links.new(sep.outputs['Z'], comb.inputs['Y'])
    brick = nt.nodes.new('ShaderNodeTexBrick')
    brick.offset = .5
    brick.inputs['Scale'].default_value = 1
    brick.inputs['Mortar Size'].default_value = .011
    brick.inputs['Mortar Smooth'].default_value = .35
    brick.inputs['Brick Width'].default_value = width
    brick.inputs['Row Height'].default_value = height
    brick.inputs['Color1'].default_value = _lin(*color)
    brick.inputs['Color2'].default_value = _lin(*_scaled(color, .95))
    brick.inputs['Mortar'].default_value = _lin(*_scaled(color, .78))
    nt.links.new(comb.outputs[0], brick.inputs['Vector'])
    nt.links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .82
    bsdf.inputs['Specular IOR Level'].default_value = .3
    grit = _noise(nt, _world_vector(nt, (1, 1, 1)), 90, 4, .6)
    both = nt.nodes.new('ShaderNodeMath')
    both.operation = 'MULTIPLY_ADD'
    nt.links.new(grit, both.inputs[0])
    both.inputs[1].default_value = .12
    nt.links.new(brick.outputs['Fac'], both.inputs[2])
    _bump(nt, bsdf, both.outputs[0], .5, .006)
    mat.diffuse_color = _lin(*color)
    return mat


def carpet(mat, color, sheen=1.0):
    """Cut-pile carpet: fibrous bump, colour breakup and pile sheen."""
    nt, bsdf, _ = _principled(mat)
    vec = _world_vector(nt, (1, 1, 1))
    tone = _noise(nt, vec, 45, 5, .6)
    nt.links.new(_ramp(nt, tone, _scaled(color, .84), _scaled(color, 1.12), .3, .7),
                 bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .95
    bsdf.inputs['Specular IOR Level'].default_value = .2
    bsdf.inputs['Sheen Weight'].default_value = sheen
    bsdf.inputs['Sheen Roughness'].default_value = .45
    pile = _noise(nt, vec, 380, 3, .7)
    _bump(nt, bsdf, pile, .45, .003)
    mat.diffuse_color = _lin(*color)
    return mat


def fabric(mat, color, sheen=.5, rough=.85, velvet=False, bump_distance=.0015):
    """Woven upholstery and curtains; velvet gets a strong directional sheen."""
    nt, bsdf, _ = _principled(mat)
    vec = _world_vector(nt, (1, 1, 1))
    tone = _noise(nt, vec, 60, 4, .55)
    nt.links.new(_ramp(nt, tone, _scaled(color, .9), _scaled(color, 1.08), .3, .7),
                 bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Specular IOR Level'].default_value = .25
    bsdf.inputs['Sheen Weight'].default_value = 1.0 if velvet else sheen
    bsdf.inputs['Sheen Roughness'].default_value = .3 if velvet else .6
    if velvet:
        bsdf.inputs['Sheen Tint'].default_value = _lin(*_scaled(color, 1.6))
    weave = _noise(nt, vec, 260, 2, .5)
    _bump(nt, bsdf, weave, .18, bump_distance)
    mat.diffuse_color = _lin(*color)
    return mat


def ceramic(mat, color, rough=.1):
    """Glazed tile: hard, glossy, slightly wavy."""
    nt, bsdf, _ = _principled(mat)
    bsdf.inputs['Base Color'].default_value = _lin(*color)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Specular IOR Level'].default_value = .5
    bsdf.inputs['Coat Weight'].default_value = 1
    bsdf.inputs['Coat Roughness'].default_value = .04
    wobble = _noise(nt, _world_vector(nt, (1, 1, 1)), 12, 2, .5)
    _bump(nt, bsdf, wobble, .04, .001)
    mat.diffuse_color = _lin(*color)
    return mat


def metal(mat, color, rough=.3, brushed=False, metallic=1.0):
    nt, bsdf, _ = _principled(mat)
    bsdf.inputs['Base Color'].default_value = _lin(*color)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = rough
    if brushed:
        # Horizontal brush streaks: roughness varies quickly up the surface only.
        streak = _noise(nt, _world_vector(nt, (.4, .4, 700)), 1, 2, .5)
        nt.links.new(_range(nt, streak, rough - .1, rough + .1), bsdf.inputs['Roughness'])
        _bump(nt, bsdf, streak, .04, .0004)
    mat.diffuse_color = _lin(*color)
    return mat


def marble(mat, base, vein, rough=.16, coat=.6):
    """Grey-veined white laminate counter."""
    nt, bsdf, _ = _principled(mat)
    vec = _world_vector(nt, (1.3, 1.3, 1.3))
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'DIAGONAL'
    wave.inputs['Scale'].default_value = .9
    wave.inputs['Distortion'].default_value = 7
    wave.inputs['Detail'].default_value = 5
    wave.inputs['Detail Scale'].default_value = 1.3
    wave.inputs['Detail Roughness'].default_value = .7
    nt.links.new(vec, wave.inputs['Vector'])
    veins = _ramp(nt, wave.outputs['Fac'], base, vein, .55, .92)
    cloud = _noise(nt, vec, 4, 5, .55)
    mixer = nt.nodes.new('ShaderNodeMix')
    mixer.data_type = 'RGBA'
    mixer.inputs['Factor'].default_value = .35
    nt.links.new(veins, mixer.inputs[6])
    nt.links.new(_ramp(nt, cloud, _scaled(base, .93), base, .3, .7), mixer.inputs[7])
    nt.links.new(mixer.outputs[2], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Coat Roughness'].default_value = .08
    mat.diffuse_color = _lin(*base)
    return mat


def glass(mat, tint=(.93, .97, .96)):
    nt, bsdf, _ = _principled(mat)
    bsdf.inputs['Base Color'].default_value = _lin(*tint)
    bsdf.inputs['Roughness'].default_value = 0
    bsdf.inputs['IOR'].default_value = 1.5
    bsdf.inputs['Transmission Weight'].default_value = 1
    mat.diffuse_color = _lin(.82, .94, .95)
    return mat


def translucent_shade(mat, color):
    """Linen lampshade that glows when its bulb is on."""
    nt, bsdf, out = _principled(mat)
    bsdf.inputs['Base Color'].default_value = _lin(*color)
    bsdf.inputs['Roughness'].default_value = .9
    bsdf.inputs['Specular IOR Level'].default_value = .15
    trans = nt.nodes.new('ShaderNodeBsdfTranslucent')
    trans.inputs['Color'].default_value = _lin(*_scaled(color, 1.1))
    mix = nt.nodes.new('ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = .55
    nt.links.new(bsdf.outputs[0], mix.inputs[1])
    nt.links.new(trans.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    weave = _noise(nt, _world_vector(nt, (1, 1, 1)), 300, 2, .5)
    _bump(nt, bsdf, weave, .2, .001)
    mat.diffuse_color = _lin(*color)
    return mat


def siding(mat, color, course=.20):
    """Vinyl lap siding: horizontal courses with a shadow line under each lap."""
    nt, bsdf, _ = _principled(mat)
    tone = _noise(nt, _world_vector(nt, (1, 1, 1)), 3, 3, .5)
    nt.links.new(_ramp(nt, tone, _scaled(color, .94), _scaled(color, 1.04), .3, .7), bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .5
    bsdf.inputs['Specular IOR Level'].default_value = .4
    saw = nt.nodes.new('ShaderNodeTexWave')
    saw.wave_type = 'BANDS'
    saw.bands_direction = 'Z'
    saw.wave_profile = 'SAW'
    saw.inputs['Scale'].default_value = 1 / course
    nt.links.new(_world_vector(nt, (1, 1, 1)), saw.inputs['Vector'])
    _bump(nt, bsdf, saw.outputs['Fac'], .6, .012)
    mat.diffuse_color = _lin(*color)
    return mat


def panel_cladding(mat, light, dark):
    """Video-observed dark rectangular panels with pale, aligned seams.

    Construction material is unknown; preserve the visible finish without
    asserting that these are cedar shakes. Panel dimensions are estimates.
    """
    nt, bsdf, _ = _principled(mat)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs[0])
    along = nt.nodes.new('ShaderNodeMath')
    along.operation = 'ADD'
    nt.links.new(sep.outputs['X'], along.inputs[0])
    nt.links.new(sep.outputs['Y'], along.inputs[1])
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(along.outputs[0], comb.inputs['X'])
    nt.links.new(sep.outputs['Z'], comb.inputs['Y'])
    brick = nt.nodes.new('ShaderNodeTexBrick')
    brick.offset = 0
    brick.inputs['Scale'].default_value = 1
    brick.inputs['Mortar Size'].default_value = .010
    brick.inputs['Mortar Smooth'].default_value = .2
    brick.inputs['Brick Width'].default_value = 1.20
    brick.inputs['Row Height'].default_value = .60
    brick.inputs['Bias'].default_value = 0
    nt.links.new(comb.outputs[0], brick.inputs['Vector'])
    mottle = _noise(nt, _world_vector(nt, (1, 1, 1)), 6, 4, .6)
    brick.inputs['Color1'].default_value = _lin(*dark)
    brick.inputs['Color2'].default_value = _lin(*light)
    brick.inputs['Mortar'].default_value = _lin(.48, .44, .36)
    mixer = nt.nodes.new('ShaderNodeMix')
    mixer.data_type = 'RGBA'
    nt.links.new(mottle, mixer.inputs['Factor'])
    nt.links.new(brick.outputs['Color'], mixer.inputs[6])
    nt.links.new(_ramp(nt, _noise(nt, _world_vector(nt, (1, 1, 1)), 1.2, 3, .5), _scaled(dark, .8), _scaled(light, 1.1), .3, .7), mixer.inputs[7])
    nt.links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .85
    bsdf.inputs['Specular IOR Level'].default_value = .25
    grain = _noise(nt, _world_vector(nt, (1, 1, 1)), 90, 2, .5)
    both = nt.nodes.new('ShaderNodeMath')
    both.operation = 'MULTIPLY_ADD'
    nt.links.new(grain, both.inputs[0])
    both.inputs[1].default_value = .08
    nt.links.new(brick.outputs['Fac'], both.inputs[2])
    _bump(nt, bsdf, both.outputs[0], .5, .004)
    mat.diffuse_color = _lin(*[(a + b) / 2 for a, b in zip(light, dark)])
    return mat


def shingle_roof(mat, color):
    """Brown asphalt shingles: granular surface with horizontal course lines."""
    nt, bsdf, _ = _principled(mat)
    grit = _noise(nt, _world_vector(nt, (1, 1, 1)), 120, 3, .6)
    nt.links.new(_ramp(nt, grit, _scaled(color, .75), _scaled(color, 1.25), .3, .7), bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .92
    bsdf.inputs['Specular IOR Level'].default_value = .2
    saw = nt.nodes.new('ShaderNodeTexWave')
    saw.wave_type = 'BANDS'
    saw.bands_direction = 'Z'
    saw.wave_profile = 'SAW'
    saw.inputs['Scale'].default_value = 8
    nt.links.new(_world_vector(nt, (1, 1, 1)), saw.inputs['Vector'])
    both = nt.nodes.new('ShaderNodeMath')
    both.operation = 'MULTIPLY_ADD'
    nt.links.new(grit, both.inputs[0])
    both.inputs[1].default_value = .35
    nt.links.new(saw.outputs['Fac'], both.inputs[2])
    _bump(nt, bsdf, both.outputs[0], .6, .006)
    mat.diffuse_color = _lin(*color)
    return mat


def lawn(mat, green, straw):
    """Mown lawn: patchy colour at two scales and a fine blade texture."""
    nt, bsdf, _ = _principled(mat)
    vec = _world_vector(nt, (1, 1, 1))
    patches = _noise(nt, vec, .35, 3, .55)
    fine = _noise(nt, vec, 9, 4, .6)
    fac = _mix_fac(nt, patches, fine, .4)
    nt.links.new(_ramp(nt, fac, green, straw, .3, .75), bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .9
    bsdf.inputs['Specular IOR Level'].default_value = .15
    blades = _noise(nt, vec, 140, 3, .7)
    _bump(nt, bsdf, blades, .7, .01)
    mat.diffuse_color = _lin(*green)
    return mat


def foliage(mat, color):
    """Leaf clusters: two-sided, slightly translucent, varied per cluster."""
    nt, bsdf, out = _principled(mat)
    vec = _world_vector(nt, (1, 1, 1))
    tone = _noise(nt, vec, 1.5, 2, .5)
    base = _ramp(nt, tone, _scaled(color, .7), _scaled(color, 1.35), .3, .7)
    nt.links.new(base, bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .55
    bsdf.inputs['Specular IOR Level'].default_value = .3
    trans = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(base, trans.inputs['Color'])
    mix = nt.nodes.new('ShaderNodeMixShader')
    mix.inputs['Fac'].default_value = .3
    nt.links.new(bsdf.outputs[0], mix.inputs[1])
    nt.links.new(trans.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    mat.diffuse_color = _lin(*color)
    return mat


def glow(name, color, strength, diffuse):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nt, bsdf, _ = _principled(mat)
    bsdf.inputs['Base Color'].default_value = _lin(*diffuse)
    bsdf.inputs['Emission Color'].default_value = _lin(*color)
    bsdf.inputs['Emission Strength'].default_value = strength
    bsdf.inputs['Roughness'].default_value = .4
    mat.diffuse_color = _lin(*diffuse)
    return mat


# ---------------------------------------------------------------- materials

# Oak strip floor. Boards run along +X; each board object is offset so the
# grain differs from its neighbours while the eight tones stay distinct.
for i in range(8):
    t = i / 7
    # Relative honey/tan variation is observed; RGB remains exposure-dependent.
    light = (.42 + .14 * t, .245 + .09 * t, .11 + .065 * t)
    dark = (.15 + .075 * t, .075 + .04 * t, .025 + .028 * t)
    wood(_mat('Oak floor board tone %02d' % i), light, dark, 'x', 1, .30, .38)
wood(_mat('Honey oak grain'), (.50, .27, .095), (.22, .10, .035), 'x', 1.4, .32, .30)
wood(_mat('Climbing frame varnished pine'), (.64, .38, .14), (.36, .18, .06), 'z', 1.6, .3, .3)
wood(_mat('Dark walnut'), (.20, .085, .038), (.075, .03, .013), 'x', 1.3, .26, .45)
# H199: Jeannie's cabinet is near-espresso brown, darker than the bookcase.
# This dedicated finish does not recolour other walnut furniture.
wood(_mat('Jeannie dark polished walnut'), (.075, .033, .018), (.025, .010, .006), 'x', 1.3, .31, .30)
wood(_mat('Natural wicker'), (.36, .20, .085), (.17, .085, .035), 'x', 6, .7, 0, 1)
wood(_mat('Exposed timber joists'), (.11, .05, .022), (.045, .02, .008), 'x', 1, .78, 0)
wood(_mat('Garden tree bark'), (.11, .085, .065), (.028, .022, .017), 'z', 2.0, .95, 0)
foliage(_mat('Deciduous tree leaves'), (.12, .27, .06))
foliage(_mat('Spruce needles'), (.04, .11, .05))
for i in range(4):
    foliage(_mat('Garden foliage %d' % i), [(.13, .25, .065), (.21, .34, .10), (.29, .37, .12), (.10, .20, .055)][i])
siding(_mat('Pale blue-grey vinyl lap siding'), (.33, .40, .45))
siding(_mat('Warm tan vinyl lap siding'), (.46, .39, .28))
panel_cladding(_mat('Weathered dark exterior panels'), (.08, .075, .065), (.065, .06, .052))
shingle_roof(_mat('Brown asphalt roof shingles'), (.16, .105, .07))
paint(_mat('Driveway charcoal asphalt'), (.11, .12, .13), .95, .4)

# Painted walls, ceilings and trim.
paint(_mat('Pale sage plaster'), (.58, .61, .51))
paint(_mat('Warm dining plaster'), (.80, .71, .45))
paint(_mat('Upstairs warm grey plaster'), (.60, .59, .56))
paint(_mat('Nursery dusty blue plaster'), (.24, .34, .51))
paint(_mat('Ensuite cream plaster'), (.80, .75, .60))
paint(_mat('Ensuite grey vinyl floor'), (.30, .30, .29), .42, .03, .15)
enamel(_mat('Ensuite taupe vanity cabinet'), (.26, .22, .19), .38, .2)
enamel(_mat('Warm white enamel'), (.84, .84, .81), .32, .22)
enamel(_mat('Front door berry red'), (.66, .03, .05), .28, .35)
enamel(_mat('Pink childrens shelving'), (.50, .04, .17), .3, .2)
blocks(_mat('Painted foundation blocks'), (.74, .74, .70))
paint(_mat('Garage and basement concrete'), (.36, .36, .34), .9, .3)
paint(_mat('Front porch clean concrete'), (.42, .43, .40), .9, .3)
paint(_mat('Path warm grey pavers'), (.30, .27, .23), .88, .3)
paint(_mat('Warm grey grout'), (.45, .46, .43), .95, .2)
paint(_mat('Muted grey tile pattern'), (.34, .37, .36), .5, .02)
for i in range(3):
    paint(_mat('Sunroom mat %d' % i), [(.55, .53, .46), (.47, .52, .50), (.62, .59, .50)][i], .9, .12)

# Kitchen and bathroom hard finishes.
ceramic(_mat('Ivory ceramic'), (.87, .87, .84), .1)
ceramic(_mat('Bathroom sea green glazed tile'), (.16, .43, .32), .12)
ceramic(_mat('Bathroom dark green accent tile'), (.025, .13, .085), .12)
marble(_mat('Pale speckled stone countertop'), (.82, .82, .80), (.42, .43, .46))
metal(_mat('Brushed stainless'), (.56, .57, .58), .3, brushed=True)
metal(_mat('Warm brass'), (.62, .45, .18), .32)
metal(_mat('Silver mirror'), (.92, .93, .95), .02)
metal(_mat('Black iron'), (.02, .02, .02), .42, metallic=.35)
paint(_mat('Dark appliance glass'), (.01, .012, .015), .08, .01, 1)
glass(_mat('Window glass'))

# Soft furnishings.
carpet(_mat('Clean warm beige carpet'), (.55, .45, .31))
carpet(_mat('Cory light grey plush carpet'), (.44, .43, .40))
fabric(_mat('Oatmeal sofa upholstery'), (.52, .48, .40))
fabric(_mat('Living sofa taupe upholstery'), (.28, .255, .22), .35, .88)
fabric(_mat('Living tub chair warm taupe upholstery'), (.34, .275, .21), .4, .88)
fabric(_mat('Living child lounge navy upholstery'), (.018, .030, .075), .35, .90)
fabric(_mat('Primary grey cotton headboard'), (.30, .305, .30), .4, .88, bump_distance=.0008)
for mat in bpy.data.materials:
    if mat.name == 'Cory muted pink cotton pillow' or mat.name.startswith('Cory quilt cotton '):
        # Preserve the observed patch/pillow colours; replace the coarse base
        # material's 15 mm bump with sub-millimetre cotton weave.
        fabric(mat, tuple(mat.diffuse_color[:3]), .3, .93, bump_distance=.0006)
fabric(_mat('Sunroom blue grey cushions'), (.27, .38, .41))
fabric(_mat('Small sofa deep teal blue'), (.02, .09, .30), .7, .7)
fabric(_mat('Family room olive chair'), (.14, .22, .13), velvet=True)
fabric(_mat('Clean ivory cotton bedding'), (.84, .81, .71), .3, .9)
fabric(_mat('Light grey woven curtains'), (.57, .59, .56), .4)
fabric(_mat('Charcoal patterned bedroom curtains'), (.20, .21, .23), .4)
fabric(_mat('Rose bedroom curtains'), (.48, .17, .16), .4)
translucent_shade(_mat('Warm linen lampshade'), (.85, .72, .48))
lawn(_mat('Yard soft green lawn'), (.09, .23, .035), (.22, .28, .07))
lawn(_mat('Simple front lawn'), (.09, .23, .035), (.22, .28, .07))

# Basement play floor: the photographs show tan laminate planks, not bare slab.
laminate = bpy.data.materials.new('Basement tan laminate planks')
wood(laminate, (.62, .42, .21), (.42, .26, .11), 'x', .8, .34, .18, 0)
floor = bpy.data.objects['Basement concrete floor']
floor.data.materials.clear()
floor.data.materials.append(laminate)

# Practical light sources that the camera can see.
bulb_glow = glow('Warm glowing bulb', (1, .78, .5), 14, (.98, .9, .7))
diffuser_glow = glow('Warm lit diffuser', (1, .86, .66), 5, (.95, .9, .8))
for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    if obj.name.startswith('Bulb'):
        obj.data.materials.clear()
        obj.data.materials.append(bulb_glow)
    elif obj.name.startswith('Recessed diffuser') or obj.name.startswith('Fan light diffuser'):
        obj.data.materials.clear()
        obj.data.materials.append(diffuser_glow)

# ---------------------------------------------------------------- lighting

WARM = (1.0, .80, .58)
COLL = bpy.data.collections['15 | Studio lighting and cameras']
ROOT = None


def _light(name, kind, pos, energy, color=WARM, **props):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    for key, value in props.items():
        setattr(data, key, value)
    obj = bpy.data.objects.new(name, data)
    COLL.objects.link(obj)
    obj.location = pos
    return obj


bpy.context.view_layer.update()
for obj in list(scene.objects):
    if obj.type == 'LIGHT' and obj.name.endswith(' warm bulb'):
        obj.data.energy = 42
        obj.data.color = (1, .76, .46)
        obj.data.shadow_soft_size = .05
    elif obj.type == 'LIGHT' and 'ceiling fill' in obj.name:
        obj.data.energy *= .55
        obj.data.color = (1, .93, .82)
    elif obj.type == 'MESH' and obj.name.startswith('Recessed diffuser'):
        p = obj.matrix_world.translation
        _light('Recessed can ' + obj.name[-2:].strip(), 'SPOT', (p.x, p.y, p.z - .012), 26,
               spot_size=math.radians(115), spot_blend=.7, shadow_soft_size=.07)
    elif obj.type == 'MESH' and obj.name.startswith('Fan light diffuser'):
        p = obj.matrix_world.translation
        _light('Family room fan light', 'POINT', (p.x, p.y, p.z - .06), 34, shadow_soft_size=.1)
bpy.data.objects['Kitchen ceiling illumination'].data.energy = 40

# Warm strip under the upper cabinets, along the rear subway-tile run.
tiles = [o for o in scene.objects if o.name.startswith('Rear subway tile')]
if tiles:
    xs = [o.matrix_world.translation.x for o in tiles]
    ys = [o.matrix_world.translation.y for o in tiles]
    z = max(o.matrix_world.translation.z for o in tiles) + .06
    along_x = (max(xs) - min(xs)) > (max(ys) - min(ys))
    length = (max(xs) - min(xs)) if along_x else (max(ys) - min(ys))
    strip = _light('Under-cabinet light strip', 'AREA', ((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, z),
                   14, (1, .84, .62), shape='RECTANGLE', size=length, size_y=.03)
    strip.rotation_euler = (0, 0, 0 if along_x else math.pi / 2)

# Fairy lights along the top of the living-room walls, as in the photographs.
COLL = bpy.data.collections['09 | Living room furniture'] if '09 | Living room furniture' in bpy.data.collections else COLL
asset('Living room fairy light strings', photos='7,8', confidence='visible in photos; run estimated')
fairy = glow('Fairy light bulb', (1, .84, .6), 30, (1, .95, .8))
points = []
for a, b in [((.10, .10, 2.52), (.10, 4.35, 2.52)), ((.10, .10, 2.52), (5.05, .10, 2.52)),
             ((.12, 4.35, 2.52), (3.26, 4.35, 2.52))]:
    a, b = Vector(a), Vector(b)
    n = max(2, int((b - a).length / .09))
    for k in range(n + 1):
        t = k / n
        sag = .025 * math.sin(math.pi * ((t * (b - a).length) % .9) / .9)
        points.append(a.lerp(b, t) - Vector((0, 0, sag)))
verts, faces = [], []
r = .0045
for p in points:
    base = len(verts)
    verts += [(p.x + r, p.y, p.z), (p.x - r, p.y, p.z), (p.x, p.y + r, p.z),
              (p.x, p.y - r, p.z), (p.x, p.y, p.z + r), (p.x, p.y, p.z - r)]
    faces += [(base, base + 2, base + 4), (base + 2, base + 1, base + 4), (base + 1, base + 3, base + 4),
              (base + 3, base, base + 4), (base + 2, base, base + 5), (base + 1, base + 2, base + 5),
              (base + 3, base + 1, base + 5), (base, base + 3, base + 5)]
mesh = bpy.data.meshes.new('Fairy light bulbs')
mesh.from_pydata(verts, [], faces)
finish(bpy.data.objects.new('Fairy light bulbs', mesh), 'Fairy light bulbs', fairy)
curve('Fairy light wire', [tuple(p) for p in points], .0012, _mat('Black iron'))
COLL = bpy.data.collections['15 | Studio lighting and cameras']
ROOT = None

# Sky and soft sun. The photographs show bright, overcast-soft daylight at
# the windows without hard sun patches, so the sun is wide and moderate.
world = scene.world
nt = world.node_tree
bg = nt.nodes['Background']
sky = nt.nodes.new('ShaderNodeTexSky')
sky.sky_type = 'NISHITA'
sky.sun_disc = False
sky.sun_elevation = math.radians(36)
sky.sun_rotation = math.pi
sky.sun_intensity = 1
sky.altitude = 120
sky.air_density = 1
sky.dust_density = .7
sky.ozone_density = 1.2
nt.links.new(sky.outputs['Color'], bg.inputs['Color'])
bg.inputs['Strength'].default_value = 1.4
# The sky lights the model, but rays leaving the camera straight into the
# world see a soft studio backdrop instead of the black below the horizon.
backdrop = nt.nodes.new('ShaderNodeBackground')
backdrop.inputs['Color'].default_value = (.62, .70, .80, 1)
backdrop.inputs['Strength'].default_value = 1.0
path = nt.nodes.new('ShaderNodeLightPath')
mix = nt.nodes.new('ShaderNodeMixShader')
mix.name = 'Camera backdrop mix'
nt.links.new(path.outputs['Is Camera Ray'], mix.inputs['Fac'])
nt.links.new(bg.outputs[0], mix.inputs[1])
nt.links.new(backdrop.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], nt.nodes['World Output'].inputs['Surface'])
sun = _light('Soft daylight sun', 'SUN', (5, -12, 12), 2.2, (1, .96, .90), angle=math.radians(9))
sun.rotation_euler = Vector((.35, 1, -.75)).to_track_quat('-Z', 'Y').to_euler()

STUDIO_LIGHTS = ['Large softbox daylight', 'Sunroom daylight', 'Front daylight']
for name in STUDIO_LIGHTS:
    bpy.data.objects[name].data.energy *= .6

# ---------------------------------------------------------------- render

scene.cycles.use_light_tree = True
scene.cycles.max_bounces = 10
scene.cycles.diffuse_bounces = 5
scene.cycles.glossy_bounces = 5
scene.cycles.transmission_bounces = 10
scene.cycles.transparent_max_bounces = 12
scene.cycles.volume_bounces = 0
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.sample_clamp_direct = 0
scene.cycles.sample_clamp_indirect = 6
scene.cycles.blur_glossy = .8
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .02
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
scene.cycles.denoising_prefilter = 'ACCURATE'
scene.render.filter_size = 1.4
scene.render.use_persistent_data = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0.0
scene.view_settings.gamma = 1.0

VIEW_EXPOSURE = {'kitchen': .15, 'kitchen_access': .15, 'overview': -.15, 'plan': -.15, 'upper_plan': -.15,
                 'basement_plan': -.15, 'upper_overview': -.15, 'front_yard': -1.2, 'back_yard': -1.2, 'porch': -.8, 'street_front': -1.3, 'rear_elevation': -1.3,
                 'basement_play': .35, 'basement_office': .35, 'basement_laundry': .35,
                 'basement_entry': .35, 'garage': .2}


def photoreal_view(name, exterior):
    """Per-view lighting: studio softboxes only for cutaway/plan views;
    interiors are lit by the sky, the soft sun and the practical lamps."""
    for light in STUDIO_LIGHTS:
        bpy.data.objects[light].hide_render = not exterior
    scene.view_settings.exposure = VIEW_EXPOSURE.get(name, 0.0)
    # Outdoor views see the real sky; everything else gets the neutral backdrop.
    outdoors = name in {'front_yard', 'back_yard', 'porch', 'street_front', 'rear_elevation'}
    scene.world.node_tree.nodes['Camera backdrop mix'].mute = outdoors
