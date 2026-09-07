"""Visible landscaping from photos 1–5 and V4–V5; distances are estimates.

No neighbouring houses, addresses, people or private photos are reproduced.
"""
yard_collection = collection('42 | Front and back yards')
lawn = material('Yard soft green lawn', (.19,.30,.085), .98, texture='fabric')
leaves = [material('Garden foliage '+str(i), c, .95) for i,c in enumerate([
    (.13,.25,.065),(.21,.34,.10),(.29,.37,.12),(.10,.20,.055)])]
mulch = material('Garden dark mulch',(.12,.085,.047),.99,texture='stone')
asphalt = material('Driveway charcoal asphalt',(.13,.15,.16),.98,texture='stone')
shedmat = material('Shed taupe resin',(.49,.43,.38),.8)
netmat = material('Trampoline netting',(.10,.13,.12),.9)
yard_z = -.82

# Keep soil outside the building rectangles, including the below-grade floors.
asset('Front lawn and driveway',photos='V4,V5',confidence='lawn, drive and tree positions visible; boundary and distances estimated')
box('Front lawn',(6,-10.5,yard_z-.10),(30,13,.20),lawn)
box('Front foundation lawn',(-.1,-2.0,yard_z-.10),(8.8,4,.20),lawn)
box('Front side lawn',(14,-2.0,yard_z-.10),(12.4,4,.20),lawn)
box('Asphalt driveway',(-3.35,-4.4,yard_z+.005),(5.8,10.4,.045),asphalt,.015)
box('Street at edge of study',(5.4,-17.6,yard_z-.01),(34,3,.08),asphalt)
asset('Back and side lawns',photos='1-5',confidence='lawn visible through sunroom; extent estimated')
box('Rear lawn',(6,20,yard_z-.10),(30,16,.20),lawn)
box('Sunroom rear grass strip',(4.1,11.72,yard_z-.10),(6.6,.64,.20),lawn)
box('West side lawn',(-7,5,yard_z-.10),(4,14,.20),lawn)
box('East side lawn',(21,5,yard_z-.10),(4,14,.20),lawn)
box('Rear east lawn',(16,10.7,yard_z-.10),(17,2.6,.20),lawn)
box('Rear west lawn',(-3,10.7,yard_z-.10),(7.6,2.6,.20),lawn)

leafmat = material('Deciduous tree leaves', (.12, .27, .06), .6)
bark = material('Garden tree bark',(.13,.10,.075),.98,texture='wood')


def _leaf_mesh(name, leaves, rng, size, mat, export=True):
    """One mesh of small diamond leaf clusters with no alpha textures. Trees
    carry a dense mesh for the render and a coarse stand-in for the browser
    export (``export=False`` marks the dense one)."""
    verts, faces = [], []
    for centre, normal in leaves:
        n = Vector(normal).normalized()
        u = n.cross(Vector((0, 0, 1)) if abs(n.z) < .9 else Vector((1, 0, 0))).normalized()
        v = n.cross(u)
        r = size * rng.uniform(.7, 1.3)
        base = len(verts)
        spin = rng.uniform(0, math.tau)
        for k in range(4):
            a = spin + k * math.tau / 4
            verts.append(tuple(centre + (u * math.cos(a) + v * math.sin(a)) * r * (1 if k % 2 else .7)))
        faces.append(tuple(range(base, base + 4)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    obj = finish(bpy.data.objects.new(name, mesh), name, mat)
    obj['export'] = export
    for poly in mesh.polygons:
        poly.use_smooth = False
    return obj


def _branch_curve(name, splines, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = 1.0
    data.bevel_resolution = 3
    data.use_fill_caps = True
    for pts in splines:
        spl = data.splines.new('POLY')
        spl.points.add(len(pts) - 1)
        for point, (x, y, z, radius) in zip(spl.points, pts):
            point.co = (x, y, z, 1)
            point.radius = radius
    data.materials.append(mat)
    obj = bpy.data.objects.new(name, data)
    COLL.objects.link(obj)
    obj.parent = ROOT
    return obj


def shrub(name,pos,size,photo):
    asset(name,pos,photos=photo,confidence='planting observed; shape simplified')
    rng = random.Random(name)
    sphere('Shrub inner mass',(0,0,size[2]*.45),(size[0]*.8,size[1]*.8,size[2]*.8),leaves[3])
    leaves_out = []
    count = int(110 * size[0] * size[2] / .2)
    for _ in range(count):
        d = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, .8))).normalized()
        c = Vector((d.x * size[0], d.y * size[1], size[2] * .45 + d.z * size[2]))
        leaves_out.append((c, d + Vector((rng.uniform(-.5,.5), rng.uniform(-.5,.5), rng.uniform(-.3,.5)))))
    _leaf_mesh('Shrub leaf clusters', leaves_out, rng, .10, leafmat)


def tree(name,pos,height,width,photo,trunk=.24,willow=False):
    """Recursive limb tree: a curve of tapered branches and one mesh of leaf
    clusters around the outer twigs. Species and sizes are approximate."""
    asset(name,pos,photos=photo,confidence='tree visible; species and size approximate')
    rng = random.Random(name)
    splines, leaves_out, dense = [], [], []

    def branch(start, direction, length, radius, depth):
        pts, cur, d = [], Vector(start), Vector(direction).normalized()
        n = 6
        for i in range(n + 1):
            pts.append((cur.x, cur.y, cur.z, radius * (1 - .55 * i / n)))
            wander = .28 if depth else .07
            d = (d + Vector((rng.uniform(-wander, wander), rng.uniform(-wander, wander),
                             rng.uniform(-.04, .22) if depth else rng.uniform(-.05, .05)))).normalized()
            cur = cur + d * length / n
        splines.append(pts)
        if depth >= 3:
            for x, y, z, _r in pts[1:]:
                for _ in range(7):
                    c = Vector((x, y, z)) + Vector((rng.uniform(-.5, .5), rng.uniform(-.5, .5), rng.uniform(-.3, .45)))
                    leaves_out.append((c, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-.2, 1)))))
                for _ in range(26):
                    c = Vector((x, y, z)) + Vector((rng.uniform(-.55, .55), rng.uniform(-.55, .55), rng.uniform(-.35, .5)))
                    dense.append((c, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-.2, 1)))))
        if depth < 4:
            for _ in range(rng.randint(3, 5) if depth == 0 else rng.randint(3, 4) if depth == 1 else rng.randint(2, 3)):
                t = rng.uniform(.55, 1.0) if depth == 0 else rng.uniform(.3, 1.0)
                idx = min(n, int(round(t * n)))
                base = Vector(pts[idx][:3])
                side = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(.15, .9))).normalized()
                nd = (d * .55 + side).normalized()
                if willow and depth >= 2:
                    nd = (nd + Vector((0, 0, -.9))).normalized()
                branch(base, nd, length * rng.uniform(.55, .74), radius * .5, depth + 1)

    branch((0, 0, 0), (0, 0, 1), height * .34, trunk, 0)
    # Fit the canopy to the observed width and height.
    top = max(c.z for c, _ in leaves_out)
    spread = max(math.hypot(c.x, c.y) for c, _ in leaves_out)
    sx, sz = (width / 2) / spread, height / top
    splines = [[(x * sx, y * sx, z * sz, r) for x, y, z, r in pts] for pts in splines]
    leaves_out = [(Vector((c.x * sx, c.y * sx, c.z * sz)), n) for c, n in leaves_out]
    dense = [(Vector((c.x * sx, c.y * sx, c.z * sz)), n) for c, n in dense]
    _branch_curve('Tree trunk and limbs', splines, bark)
    _leaf_mesh('Tree leaf clusters', leaves_out, rng, .21, leafmat).hide_render = True
    _leaf_mesh('Tree render leaves', dense, rng, .085, leafmat, export=False)


tree('Front large shade tree',(10,-12,yard_z),9.5,8.5,'V5,exterior',.42)
needlemat = material('Spruce needles', (.05, .12, .06), .7)


def conifer(name,pos,height,width,photo,trunk=.24):
    """Spruce: straight trunk, whorls of slightly drooping branches that
    shorten toward the tip, dense needle clusters (render) over coarse
    clusters (browser export)."""
    asset(name,pos,photos=photo,confidence='conifer visible; species and size approximate')
    rng = random.Random(name)
    splines, coarse, dense = [], [], []
    splines.append([(0, 0, 0, trunk), (0, 0, height * .5, trunk * .55), (0, 0, height - .3, .03), (0, 0, height, .01)])
    z = 1.1
    while z < height - .7:
        f = 1 - (z - .8) / (height - .8)
        length = width / 2 * (.12 + .88 * f)
        count = rng.randint(6, 8)
        start = rng.uniform(0, math.tau)
        for k in range(count):
            a = start + k * math.tau / count + rng.uniform(-.15, .15)
            d = Vector((math.cos(a), math.sin(a), 0))
            pts = []
            r = trunk * .25 * (.3 + .7 * f)
            n = 5
            for i in range(n + 1):
                t = i / n
                p = Vector((0, 0, z)) + d * length * t + Vector((0, 0, -.14 * length * math.sin(math.pi * t) + .10 * length * t * t))
                pts.append((p.x, p.y, p.z, r * (1 - .85 * t)))
                if i >= 1:
                    for _ in range(16):
                        c = p + Vector((rng.uniform(-.26, .26), rng.uniform(-.26, .26), rng.uniform(-.22, .1)))
                        dense.append((c, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(.3, 1)))))
                    for _ in range(2):
                        c = p + Vector((rng.uniform(-.25, .25), rng.uniform(-.25, .25), rng.uniform(-.2, .1)))
                        coarse.append((c, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(.3, 1)))))
            splines.append(pts)
        z += .36
    for _ in range(40):
        c = Vector((rng.uniform(-.25, .25), rng.uniform(-.25, .25), height - .6 + rng.uniform(0, .6)))
        dense.append((c, Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 1))))
    _branch_curve('Spruce trunk and branches', splines, bark)
    _leaf_mesh('Spruce needle clusters', coarse, rng, .24, needlemat).hide_render = True
    _leaf_mesh('Spruce render needles', dense, rng, .11, needlemat, export=False)


tree('Rear left shade tree',(-3.0,21,yard_z),8.5,6.5,'1,2,exterior',.30)
tree('Rear lawn tree',(6.2,22,yard_z),9.0,7.0,'2,5,exterior',.36)
tree('Rear right screening tree',(20,20,yard_z),7.5,5.5,'3,4',.26)
conifer('Front tall spruce',(14.6,-11.4,yard_z),12.5,5.2,'exterior')
asset('Front mulched planting beds',photos='V5')
box('Left front mulch bed',(7.8,-3.6,yard_z+.01),(1.5,1.5,.08),mulch,.08)
box('Right front mulch bed',(4.4,-5.4,yard_z+.01),(2.0,3.4,.08),mulch,.1)
for i in range(6):
    shrub('Front garden shrub %02d'%i,(3.9+(i%2)*.9,-4.2-(i//2)*1.0,yard_z),(.43,.46,.47),'V5')
for i in range(10):
    shrub('Rear fence shrub %02d'%i,(-6+i*2.8,26.4,yard_z),(.88,.65,.8),'1,2,5')

asset('Rear boundary fence',photos='1-5',confidence='fence visible; lot limits estimated')
for x in range(-8,24,2):
    box('Rear fence timber post',(x,27,yard_z+.85),(.11,.11,1.7),bark)
for z in [.45,1.3]:
    box('Rear fence horizontal rail',(7,27,yard_z+z),(30,.08,.10),shedmat)
for i in range(170):
    box('Rear fence vertical board',(-8+i*.18,27,yard_z+.85),(.145,.045,1.5),shedmat,.003)
for x in [-8,23]:
    for y in range(10,28,2):
        box('Side fence post',(x,y,yard_z+.65),(.06,.06,1.3),steel)
    for z in [.22,.60,1.10]:
        rod('Side wire fence',(x,10,yard_z+z),(x,27,yard_z+z),.006,steel)

asset('Rear garden shed',(12.2,24.1,yard_z),0,'2,5','taupe double-door shed visible; size estimated')
box('Shed body',(0,0,1.08),(3.2,2.5,2.16),shedmat)
for x in [-.7,.7]:
    box('Shed door panel',(x,-1.265,.98),(1.35,.035,1.9),cream)
    box('Shed door inner frame',(x,-1.29,.98),(1.18,.015,1.72),shedmat)
    sphere('Shed door handle',(x*.13,-1.33,1.0),(.025,.025,.065),black)
for side in [-1,1]:
    o=box('Shed pitched roof',(side*.83,0,2.31),(1.78,2.72,.10),shedmat)
    o.rotation_euler.y=side*.24

asset('Backyard trampoline',(13.7,14.1,yard_z),0,'3,4','round blue-edged trampoline with safety net')
cylinder('Trampoline jumping mat',(0,0,.79),1.75,.05,black,48)
for z,r,mat in [(.81,1.87,bluegrey),(2.65,1.87,bluegrey)]:
    curve('Trampoline circular rim',[(r*math.cos(t*math.tau/64),r*math.sin(t*math.tau/64),z) for t in range(64)],.07,mat,True)
for i in range(10):
    a=i*math.tau/10;x,y=1.85*math.cos(a),1.85*math.sin(a)
    rod('Trampoline support',(x,y,0),(x,y,2.7),.025,steel)
for i in range(72):
    a=i*math.tau/72;x,y=1.83*math.cos(a),1.83*math.sin(a)
    rod('Trampoline vertical net strand',(x,y,.88),(x,y,2.60),.003,netmat)
for z in [1.0,1.2,1.4,1.6,1.8,2,2.2,2.4]:
    curve('Trampoline horizontal net strand',[(1.83*math.cos(t*math.tau/72),1.83*math.sin(t*math.tau/72),z) for t in range(72)],.003,netmat,True)

asset('Backyard toddler slide',(7.9,17.5,yard_z),45,'2,5')
for x in [-.38,.38]:
    rod('Slide ladder upright',(x,.45,0),(x,0,.9),.05,bluegrey)
for z in [.20,.40,.60,.80]:box('Slide ladder step',(0,.45-z*.5,z),(.77,.16,.05),bluegrey)
o=box('Pale backyard slide',(0,-.85,.47),(.78,1.9,.055),cream,.035);o.rotation_euler.x=.43
for x in [-.43,.43]:
    rod('Slide raised side',(x,-1.7,.13),(x,0,.94),.065,cream)
asset('Backyard colorful play cube',(4.4,18.5,yard_z),0,'2,5')
for x in [-.45,.45]:
    for y in [-.45,.45]:box('Play cube corner',(x,y,.56),(.12,.12,1.12),holds[0],.04)
for y in [-.45,.45]:box('Play cube top rail',(0,y,1.08),(.95,.13,.13),holds[2],.04)
for x in [-.45,.45]:
    box('Play cube side rail',(x,0,.36),(.12,.9,.12),holds[1],.025)
    box('Play cube side top',(x,0,1.08),(.12,.9,.12),holds[1],.025)
asset('Rear patio table',(1.2,13.5,yard_z),0,'1')
box('Outdoor rectangular tabletop',(0,0,.75),(1.5,.85,.07),walnut)
for x in [-.58,.58]:
    for y in [-.31,.31]:rod('Outdoor table leg',(x,y,0),(x,y,.73),.025,steel)

asset('Rear sunroom steps',photos='1-5',confidence='small grade connection added for walkthrough; tread dimensions estimated')
for i in range(4):
    box('Rear garden step',(4.65,11.55+i*.27,-.18-i*.18),(1.03,.30,.18),concrete)

asset('Front walk continuation to drive',photos='V5',confidence='walk meets driveway; continuation length estimated')
for i in range(31):
    t=i/30
    x,y=4.60-5.4*t,-7.34-1.15*math.sin(t*math.pi/2)
    for j in range(5):
        box('Drive approach paver',(x,y+(j-2)*.19,-.79),(.174,.184,.055),brick,.008)
    for side in [-1,1]:
        box('Drive approach edging',(x,y+side*.57,-.75),(.19,.20,.13),concrete,.01)
