"""Landscaping from private photos and the narrated walkthroughs.

H = house-tour video seconds; B = backyard-tour video seconds. Geometry,
species, sizes and coordinates remain estimates unless explicitly stated.
The videos establish silhouettes and adjacency, not a measured site plan.

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
net_fine = material('Trampoline dark fine woven net',(.025,.032,.029),.98)
hoop_blue = material('Trampoline blue upper attachment',(.025,.07,.25),.65)
bus_red = material('Bus stop red brown molded bench',(.30,.055,.035),.48)
umbrella_red = material('Bus stop faded raspberry canvas',(.49,.12,.15),.89,texture='fabric')
sign_yellow = material('Bus stop safety yellow',(.88,.86,.045),.48)
play_blue = material('Outdoor molded sky blue',(.12,.48,.68),.42)
play_orange = material('Outdoor molded orange',(.91,.34,.055),.43)
play_lime = material('Outdoor molded lime',(.60,.77,.16),.44)
play_pink = material('Outdoor molded magenta',(.61,.08,.29),.42)
play_tan = material('Outdoor molded sand',(.58,.48,.33),.52)
chair_blue = material('Outdoor pale blue chairs',(.37,.57,.62),.58)
shed_trim = material('Shed darker taupe framing',(.31,.29,.20),.78)
shed_roof = material('Shed pale warm roof',(.62,.60,.49),.81)
yard_z = -.82

# Keep soil outside the building rectangles, including the below-grade floors.
asset('Front lawn and driveway',photos='H0,21–33; V4,V5',confidence='lawn and continuous drive-to-slab connection observed; boundary, grading and distances estimated')
box('Front lawn',(6,-10.5,yard_z-.10),(30,13,.20),lawn)
box('Front foundation lawn',(-.1,-2.0,yard_z-.10),(8.8,4,.20),lawn)
box('Front side lawn',(14,-2.0,yard_z-.10),(12.4,4,.20),lawn)
# Garage front threshold is Y=-1.8, Z=-.16. The video shows a continuous
# asphalt approach, so use an estimated slope instead of a floating slab.
box('Asphalt driveway',(-3.50,-10.30,yard_z+.005),(6.5,11,.045),asphalt,.015)
drive_mesh=bpy.data.meshes.new('Driveway graded apron')
drive_mesh.from_pydata([(-6.75,-4.8,yard_z+.025),(-.25,-4.8,yard_z+.025),
                       (-.25,-1.8,-.16),(-6.75,-1.8,-.16)],[],[(0,1,2,3)])
drive_apron=finish(bpy.data.objects.new('Asphalt apron graded to garage threshold',drive_mesh),'Asphalt apron graded to garage threshold',asphalt)
drive_apron['confidence']='H21–33: continuous drive-to-slab connection observed; grading length and slope estimated'
drive_apron['browser_walk_ramp']='y'
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


def _yard_mesh(name, verts, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    return finish(bpy.data.objects.new(name, mesh), name, mat)


def _yard_tubes(name, paths, radius, mat, sides=6):
    """Batch thin tubes into one mesh; low sided netting stays inexpensive."""
    verts, faces = [], []
    for path in paths:
        pts = [Vector(p) for p in path]
        start = len(verts)
        for i, p in enumerate(pts):
            tangent = (pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
            axis = Vector((0,0,1)) if abs(tangent.z) < .92 else Vector((0,1,0))
            u = tangent.cross(axis).normalized(); v = tangent.cross(u)
            verts.extend(tuple(p+radius*(u*math.cos(k*math.tau/sides)+v*math.sin(k*math.tau/sides))) for k in range(sides))
        for i in range(len(pts)-1):
            for k in range(sides):
                a=start+i*sides+k; b=start+i*sides+(k+1)%sides
                faces.append((a,b,b+sides,a+sides))
        faces.extend([tuple(start+k for k in reversed(range(sides))),tuple(start+(len(pts)-1)*sides+k for k in range(sides))])
    obj=_yard_mesh(name,verts,faces,mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth=len(polygon.vertices)==4
    return obj


def _yard_prism(name, profile, depth, mat, y=0):
    """Extruded X/Z silhouette for shaped molded furniture parts."""
    n=len(profile)
    verts=[(x,y+d,z) for d in [-depth/2,depth/2] for x,z in profile]
    faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]
    faces += [(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
    obj=_yard_mesh(name,verts,faces,mat)
    bevel=obj.modifiers.new('Rounded molded edges','BEVEL'); bevel.width=.018; bevel.segments=2
    return obj


def _yard_text(name,body,pos,size,mat):
    """Local Blender font converted to mesh so the browser retains the sign."""
    data=bpy.data.curves.new(name,'FONT'); data.body=body; data.align_x='CENTER'; data.align_y='CENTER'
    data.size=size; data.space_line=.86; data.resolution_u=3
    obj=finish(bpy.data.objects.new(name,data),name,mat)
    obj.location=pos; obj.rotation_euler=(math.pi/2,0,math.pi)
    bpy.context.view_layer.update()
    mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    lettering=finish(bpy.data.objects.new(name+' mesh',mesh),name+' mesh')
    lettering.location=obj.location; lettering.rotation_euler=obj.rotation_euler
    bpy.data.objects.remove(obj,do_unlink=True); bpy.data.curves.remove(data)
    return lettering


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


def shrub(name,pos,size,photo,profile='cultivated'):
    asset(name,pos,photos=photo,confidence=('planting observed; shape simplified' if profile=='cultivated' else
          'irregular overlapping edge growth observed in B5–14; lobe shapes and stem positions estimated'))
    rng = random.Random(name)
    leaves_out = []
    count = int(110 * size[0] * size[2] / .2)
    if profile != 'cultivated':
        # The rear boundary is loose foliage with gaps and visible stems,
        # not clipped topiary. Mesh leaves provide the actual open silhouette;
        # no opaque ellipsoid sits behind them in either export or render.
        sparse = profile == 'edge_stems'
        along_y = (pos[0] < -6.5 or pos[0] > 21) and pos[1] < 25
        lobes, stems = [], []
        for i in range(4 if sparse else 5):
            along = (i/((4 if sparse else 5)-1)-.5)*2.0
            centre = Vector((rng.uniform(-.30,.30)*size[0] if along_y else along*size[0]*.76,
                             along*size[1]*1.35 if along_y else rng.uniform(-.35,.35)*size[1],
                             size[2]*rng.uniform(.48,1.02)))
            radii = Vector((size[0]*(.34 if sparse else .62),size[1]*(.42 if sparse else .70),
                            size[2]*(.35 if sparse else .57)))
            lobes.append((centre,radii))
            foot=Vector((centre.x*.40,centre.y*.40,.035))
            stems.append([tuple(foot),tuple(centre*.62+Vector((0,0,.12))),tuple(centre+Vector((0,0,radii.z*.5)))])
            for direction in [-1,1]:
                stems.append([tuple(centre*.70),tuple(centre+Vector((direction*radii.x*.65,.10,radii.z*.30)))])
        # B9.003/11.005/13.005: dense, connected growth with irregular gaps.
        # Larger overlapping leaf cards keep this bounded in the browser;
        # never add an opaque core or fill the central lawn with vegetation.
        count=min(650 if sparse else 850, int(count*(.72 if sparse else 1)))
        for _ in range(count):
            centre,radii=rng.choice(lobes)
            d=Vector((rng.gauss(0,1),rng.gauss(0,1),rng.gauss(0,1))).normalized()
            spread=rng.uniform(.30,1.0)
            c=centre+Vector((d.x*radii.x,d.y*radii.y,d.z*radii.z))*spread
            c.z=max(.06,c.z)
            leaves_out.append((c,d+Vector((0,0,.35))))
        _yard_tubes('Rear boundary leafy slender stems',stems,.008,bark,5)
        _leaf_mesh('Rear boundary leafy growth',leaves_out,rng,.12 if sparse else .15,leafmat).hide_render=True
        fine=[(c+Vector((rng.uniform(-.04,.04),rng.uniform(-.04,.04),rng.uniform(-.03,.03))),n)
              for c,n in leaves_out for _ in range(2)]
        _leaf_mesh('Rear boundary fine leafy growth',fine,rng,.085 if sparse else .106,leafmat,export=False)
        return
    sphere('Shrub inner mass',(0,0,size[2]*.45),(size[0]*.8,size[1]*.8,size[2]*.8),leaves[3])
    for _ in range(count):
        d = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, .8))).normalized()
        c = Vector((d.x * size[0], d.y * size[1], size[2] * .45 + d.z * size[2]))
        leaves_out.append((c, d + Vector((rng.uniform(-.5,.5), rng.uniform(-.5,.5), rng.uniform(-.3,.5)))))
    _leaf_mesh('Shrub leaf clusters', leaves_out, rng, .10, leafmat)


def tree(name,pos,height,width,photo,trunk=.24,willow=False,broad_canopy=False):
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
    _leaf_mesh('Tree leafy canopy clusters' if broad_canopy else 'Tree leaf clusters',
               leaves_out, rng, .24 if broad_canopy else .21, leafmat).hide_render = True
    _leaf_mesh('Tree render leaves', dense, rng, .11 if broad_canopy else .085, leafmat, export=False)


tree('Front large shade tree',(10,-12,yard_z),11.5,10.0,'H0–6; V5,exterior',.55)


def young_fruit_tree(name,pos,height,width):
    asset(name,pos,photos='H0–3',confidence='two slender young trees visible; fruit-tree identity follows unverified narration; position and size estimated')
    rng=random.Random(name); foliage_points=[]
    _yard_tubes('Slender young tree trunk',[[(0,0,0),(.06,0,.8),(0,.03,height)]],.023,bark,8)
    branch_paths=[]
    for i in range(18):
        angle=i*2.4; z=.65+i*(height-.85)/18; reach=width*.45*(1-.50*i/18)
        end=Vector((math.cos(angle)*reach,math.sin(angle)*reach,z+.30))
        branch_paths.append([(0,0,z),tuple(end*.65+Vector((0,0,z*.35))),tuple(end)])
        for _ in range(30):
            c=end+Vector((rng.uniform(-.20,.20),rng.uniform(-.20,.20),rng.uniform(-.16,.22)))
            foliage_points.append((c,Vector((rng.uniform(-1,1),rng.uniform(-1,1),rng.uniform(.2,1)))))
    # The sapling's crown and twigs never stop a walker or the camera boom; a
    # low trunk guard is its one collision volume (a 23 mm trunk is below the
    # exporter's collision size, and a whole-canopy box blocked the lawn).
    _yard_tubes('Young tree lateral branches',branch_paths,.008,bark,5)['browser_collide']=False
    _leaf_mesh('Young fruit tree leaves',foliage_points,rng,.062,leafmat)['browser_collide']=False
    cylinder('Small tree mulch circle',(0,0,.016),.40,.025,mulch,24)
    cylinder('Young tree trunk guard',(0,0,.27),.10,.46,white,12)['browser_collide']=False
    # Three support stakes tied to the trunk: their joint box is the sapling's
    # collision volume, wide enough that a pet stops outside the white guard.
    stakes=[[(.26*math.cos(a),.26*math.sin(a),0),(.26*math.cos(a),.26*math.sin(a),.95)] for a in (0.4,2.5,4.6)]
    ties=[[(.25*math.cos(a),.25*math.sin(a),.80),(.03*math.cos(a),.03*math.sin(a),.78)] for a in (0.4,2.5,4.6)]
    _yard_tubes('Young tree support stakes',stakes+ties,.018,bark,6)


young_fruit_tree('Front young fruit tree near driveway',(6.4,-7.1,yard_z),2.65,1.5)
young_fruit_tree('Front young fruit tree near upper wing',(12.9,-4.3,yard_z),2.80,1.4)

# The stop belongs beside the sidewalk to the left of the drive, seen when
# turning away from the front elevation. No street name or address is drawn.
asset('Front sidewalk and grass verge',photos='H9–15',confidence='sidewalk separates sign pole from bench; width and extent estimated')
for x0,x1 in [(-9,-6.75),(-.25,21)]:
    for i in range(max(1,int((x1-x0)/1.4))):
        count=max(1,int((x1-x0)/1.4)); width=(x1-x0)/count
        box('Sidewalk concrete panel',(x0+(i+.5)*width,-14.9,yard_z+.018),(width-.015,1.2,.075),concrete,.006)

asset('Family school bus stop bench',(-8.0,-13.55,yard_z),photos='H9,18',confidence='red-brown molded slotted bench visible; dimensions and placement estimated')
for x in [-.57,.57]:
    _yard_prism('Bench molded broad leg',[(x-.065,0),(x+.065,0),(x+.06,.46),(x-.05,.47)],.48,bus_red)
for i in range(7):
    x=-.51+i*.17
    box('Bench molded seat slat',(x,-.005,.43),(.158,.48,.055),bus_red,.025)
    z=.68+.05*(1-(x/.60)**2)
    o=box('Bench slotted curved back',(x,.23,z),(.148,.046,.45),bus_red,.021); o.rotation_euler.x=-.10
_yard_tubes('Bench curved top and arms',[
    [(-.66,-.26,.61),(-.67,0,.73),(-.58,.22,.87),(0,.27,.91),(.58,.22,.87),(.67,0,.73),(.66,-.26,.61)]
],.045,bus_red,10)

asset('Bus stop umbrella',(-6.75,-13.25,yard_z),photos='H9',confidence='open muted red umbrella, black pole and ribbed weighted base; dimensions and placement estimated')
cylinder('Umbrella weighted conical base',(0,0,.085),.32,.17,black,32,top=.095)
_yard_tubes('Umbrella base ribs',[[ (.09*math.cos(a),.09*math.sin(a),.17),(.32*math.cos(a),.32*math.sin(a),.035)] for a in [i*math.tau/20 for i in range(20)]],.006,black,4)
cylinder('Umbrella black mast',(0,0,1.23),.025,2.46,black,16)
canopy_verts=[]
for radius,z in [(0.035,2.47),(.54,2.31),(1.37,2.05)]:
    for i in range(32):
        a=i*math.tau/32; canopy_verts.append((radius*math.cos(a),radius*math.sin(a),z-.04*math.sin(i*math.pi/4)**2))
canopy_faces=[tuple(reversed(range(32)))]
for band in range(2):
    for i in range(32):
        j=(i+1)%32; canopy_faces.append((band*32+i,band*32+j,(band+1)*32+j,(band+1)*32+i))
_yard_mesh('Eight panel umbrella canvas',canopy_verts,canopy_faces,umbrella_red)
_yard_tubes('Umbrella underside ribs',[[ (0,0,2.44),(.54*math.cos(a),.54*math.sin(a),2.29),(1.37*math.cos(a),1.37*math.sin(a),2.03)] for a in [i*math.tau/8 for i in range(8)]],.009,black,5)

asset('School bus stop sign and sanitizer',(-8.25,-15.75,yard_z),photos='H12–15',confidence='yellow sign on wood pole and dispenser below directly visible; height and dimensions estimated')
cylinder('Bus stop timber utility pole',(0,0,3.5),.15,7,bark,16,top=.105)
box('Yellow school bus stop sign',(0,.158,1.70),(.58,.035,.37),sign_yellow,.027)
_yard_text('School bus stop lettering','SCHOOL BUS\nSTOP',(0,.180,1.70),.103,black)
box('Sanitizer dark mounting holder',(0,.17,1.15),(.13,.06,.30),black,.01)
box('Sanitizer translucent bottle',(0,.215,1.24),(.13,.068,.17),white,.018)
box('Sanitizer label',(0,.253,1.24),(.09,.004,.08),cream,.004)
box('Sanitizer pump head',(0,.22,1.345),(.08,.075,.025),white,.006)
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


tree('Rear left shade tree',(-5.6,20.2,yard_z),12.0,13.5,'B5.002/9.003; broad canopy observed; height, spread and location estimated',.64,broad_canopy=True)
# The broad middle lawn is open in the full backyard pan. Keep the former
# centre tree with the other perimeter trees behind the shed, not in that lawn.
tree('Rear lawn tree',(16.4,26.0,yard_z),11.0,11.0,'B11.005/13.005; rear canopy observed; spread and perimeter location estimated',.43,broad_canopy=True)
tree('Rear right screening tree',(22,18.7,yard_z),10.5,11.0,'B13.005/15.007/16.007; broad edge canopy observed; dimensions and placement estimated',.39,broad_canopy=True)
conifer('Front tall conifer',(14.6,-11.4,yard_z),13.5,6.0,'H3–6; exact species unverified')
asset('Front mulched planting beds',photos='V5')
box('Left front mulch bed',(7.8,-3.6,yard_z+.01),(1.5,1.5,.08),mulch,.08)
box('Right front mulch bed',(4.4,-5.4,yard_z+.01),(2.0,3.4,.08),mulch,.1)
for i in range(6):
    shrub('Front garden shrub %02d'%i,(3.9+(i%2)*.9,-4.2-(i//2)*1.0,yard_z),(.43,.46,.47),'V5')
# These are fitted masses along the existing property edge, not a surveyed
# boundary or an inventory of individual plants. The lower fence section
# retains gaps; the right side has the taller connected growth seen in B13.
for i,(x,y,w,d,h) in enumerate([(-7.2,12.5,1.05,1.6,1.6),(-7.4,15.6,1.1,1.7,1.85),
        (-7.3,18.6,1.3,1.8,2.25),(-7.0,21.8,1.4,1.8,2.2),(-6.9,24.5,1.35,1.4,1.9),
        (-6,26.2,1.6,.9,1.6),(-3.2,26.3,1.5,.85,1.55),(-.5,26.4,1.25,.7,1.35),
        (1.5,26.5,1.2,.65,.85),(4.2,26.4,1.5,.7,1.05),(7.4,26.5,1.7,.75,1.15),
        (11.6,26.4,1.5,.8,1.6),(14.8,26.4,1.7,.9,1.9),(18.1,26.2,1.8,.85,2.7),
        (21.0,25.8,1.3,1.3,2.5),(22.0,23.5,1.2,1.8,2.5),(22.2,20,1.3,2.0,2.8),
        (22.0,16.5,1.5,2.0,2.6),(21.8,13.2,1.3,1.6,2.2)]):
    shrub('Rear boundary planting %02d'%i,(x,y,yard_z),(w,d,h),'B5.002/9.003/11.005/13.005; connected edge growth observed; density, height and placement estimated',
          profile='edge_stems' if 0<x<10 else 'hedge')

asset('Rear boundary fence',photos='B7–11; H69–72',confidence='mixed timber section and low metal fence visible; transition and boundary coordinates estimated')
for x in [-8,-6,-4,-2,0]:
    box('Weathered privacy fence post',(x,27,yard_z+.8),(.10,.10,1.6),bark,.005)
for z in [.35,1.16]:box('Weathered privacy fence rail',(-4,27,yard_z+z),(8,.07,.10),bark,.004)
for i in range(45):
    box('Weathered privacy fence board',(-8+i*.18,27,yard_z+.76),(.15,.045,1.48+(i%3)*.025),shed_trim,.004)
for x in range(0,24,2):
    cylinder('Low metal boundary post',(x,27,yard_z+.55),.026,1.1,steel,8)
_yard_tubes('Low boundary fence rails',[[ (0,27,yard_z+z),(23,27,yard_z+z)] for z in [.1,1.05]],.016,steel,6)
# Thin diagonal wire conveys the visible chain-link character without a
# solid fence plane. No reconstruction beyond the property's visible edge.
wire_paths=[]
for x in [i*.24 for i in range(96)]:
    for direction in [-1,1]:
        pts=[(x+direction*(.12 if i%2 else 0),27,yard_z+.08+i*.12) for i in range(9)]
        wire_paths.append(pts)
_yard_tubes('Rear chain link net strands',wire_paths,.0025,steel,3)

asset('Rear garden shed',(12.2,24.1,yard_z),0,'B10–12; H72','beige double-door shed and shallow pale roof visible; size and position estimated')
box('Shed body',(0,0,1.08),(3.2,2.5,2.16),shedmat)
for x in [-.7,.7]:
    box('Shed door panel',(x,-1.275,1.01),(1.35,.035,1.93),shedmat)
    for dx in [-.65,.65]:box('Shed door vertical framing',(x+dx,-1.30,1.01),(.047,.035,1.93),shed_trim,.004)
    for z in [.05,.99,1.97]:box('Shed door cross framing',(x,-1.30,z),(1.33,.035,.045),shed_trim,.004)
    sphere('Shed door handle',(x*.13,-1.33,1.0),(.025,.025,.065),black)
for x in [-1.56,1.56]:box('Shed corner framing',(x,-1.275,1.08),(.06,.04,2.16),shed_trim,.004)
for y in [-.95,-.55,-.15,.25,.65,1.05]:
    for x in [-1.605,1.605]:box('Shed vertical resin joint',(x,y,1.07),(.012,.023,2.1),shed_trim,.002)
_yard_prism('Shed front gable infill',[(-1.6,2.16),(1.6,2.16),(0,2.43)],.06,shedmat,-1.25)
for side in [-1,1]:
    o=box('Shed shallow pale roof',(side*.83,0,2.29),(1.72,2.72,.065),shed_roof,.008)
    o.rotation_euler.y=side*.165

asset('Backyard trampoline',(13.7,14.1,yard_z),0,'B0.000/15.007/16.007; H75–78','blue pad, curved poles, dark fine net, blue arched upper attachment, yellow entrance and ladder observed; dimensions, mesh spacing, hoop details and pole count estimated')
cylinder('Trampoline jumping mat',(0,0,.79),1.75,.05,black,48)
_yard_tubes('Trampoline blue spring pad',[[ (1.85*math.cos(a),1.85*math.sin(a),.81) for a in [i*math.tau/64 for i in range(65)]]],.09,play_blue,8)
pole_paths=[]
for i in range(8):
    a=i*math.tau/8
    pole_paths.append([(r*math.cos(a),r*math.sin(a),z) for r,z in [(1.83,.05),(1.87,.82),(1.98,1.66),(1.81,2.52)]])
_yard_tubes('Trampoline curved padded poles',pole_paths,.025,steel,8)
def _net_point(a,f):
    radius=1.82+.14*math.sin(f*math.pi)
    return (radius*math.cos(a),radius*math.sin(a),.88+f*(1.62-.10*math.sin(4*a)**2))
# Literal dark ribbons leave real holes in both render and browser; an alpha
# sheet would export as opaque with the current material contract. This is a
# visual average of fine fabric, not a measured weave. About 9k triangles
# replace the former coarse cylindrical grid, with no alpha sorting cost.
net_verts,net_faces=[],[]
def _net_ribbon(points):
    start=len(net_verts)
    for left,right in points:net_verts.extend([left,right])
    net_faces.extend((start+2*i,start+2*i+1,start+2*i+3,start+2*i+2) for i in range(len(points)-1))
for i in range(160):
    a=i*math.tau/160
    if abs(a-math.pi/2)<.13:continue
    _net_ribbon([(_net_point(a-.0022,f/6),_net_point(a+.0022,f/6)) for f in range(7)])
for band in range(75):
    f=(band+.5)/75
    _net_ribbon([(_net_point(a,f-.0013),_net_point(a,f+.0013))
                 for a in [math.pi/2+.13+i*(math.tau-.26)/48 for i in range(49)]])
_yard_mesh('Trampoline fine net strands',net_verts,net_faces,net_fine)
_yard_tubes('Trampoline soft upper net seam',[[ _net_point(i*math.tau/80,1) for i in range(81)]],.012,netmat,5)
_yard_tubes('Trampoline yellow zipper entrance',[[(-.19,1.86,.88),(-.17,1.96,1.25),(-.10,1.94,1.70),(0,1.84,2.12),(.10,1.94,1.70),(.17,1.96,1.25),(.19,1.86,.88)]],.011,sign_yellow,5)
_yard_tubes('Trampoline access ladder',[[ (x,2.18,.04),(x,1.88,.90)] for x in [-.26,.26]]+
            [[(-.26,2.18-.30*z/.9,z),(.26,2.18-.30*z/.9,z)] for z in [.18,.39,.60,.81]],.022,steel,6)
# B0/15/16 clearly resolves the blue rounded silhouette above the net. The
# dark inset, plain rim and hanging cords are simple fitted hoop details;
# no lettering or inferred brand is reproduced. It faces the jumping mat.
_yard_prism('Trampoline arched upper backboard',[(-.40,2.44),(.40,2.44),(.40,2.68),
    (.34,2.84),(.20,2.96),(0,3.0),(-.20,2.96),(-.34,2.84),(-.40,2.68)],.065,hoop_blue,-1.66)
box('Trampoline upper backboard inset',(0,-1.619,2.67),(.54,.015,.25),net_fine,.035)
_yard_tubes('Trampoline backboard supports',[[ (x,-1.76,2.05),(x,-1.69,2.60)] for x in [-.24,.24]],.018,steel,6)
_yard_tubes('Trampoline basketball rim',[[ (.19*math.cos(a),-1.38+.19*math.sin(a),2.51)
    for a in [i*math.tau/24 for i in range(25)]]],.012,hoop_blue,6)
_yard_tubes('Trampoline rim mounting bracket',[[(0,-1.63,2.51),(0,-1.56,2.51)]],.014,hoop_blue,6)
_yard_tubes('Trampoline hoop net strands',[[ (.19*math.cos(a),-1.38+.19*math.sin(a),2.51),
    (.12*math.cos(a+.3),-1.38+.12*math.sin(a+.3),2.30)] for a in [i*math.tau/8 for i in range(8)]],.003,netmat,3)


def molded_slide(name,pos,angle,mat=play_lime):
    asset(name,pos,angle,'B11–13; H72–75','molded slide shape visible; dimensions and slope estimated')
    path=[(0,-.02,1.10),(0,-.22,1.07),(0,-.48,.83),(0,-.90,.43),(0,-1.38,.14),(0,-1.58,.13)]
    verts=[(x,y,z) for _x,y,z in path for x in [-.29,.29]]
    _yard_mesh('Molded slide chute',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)],mat)
    _yard_tubes('Molded slide raised rims',[[(x,y,z+.045) for _,y,z in path] for x in [-.30,.30]],.047,mat,8)
    for x in [-.27,.27]:_yard_tubes('Slide ladder upright',[[(x,.53,0),(x,0,1.1),(x,-.04,1.27)]],.045,play_blue,8)
    for z in [.23,.46,.69,.92]:box('Molded slide climbing step',(0,.53*(1-z/1.1),z),(.58,.13,.06),play_blue,.02)


asset('Backyard colorful play cube',(4.4,18.5,yard_z),0,'B0,16–19; H72–75','molded blue orange lime and pink climber observed; size and placement estimated')
for x in [-.55,.55]:
    for y in [-.49,.49]:box('Climber rounded corner pillar',(x,y,.62),(.14,.15,1.24),play_orange,.055)
for y in [-.50,.50]:
    # An open arch with molded jambs, not a solid cuboid approximation.
    _yard_tubes('Climber arched panel top',[[(.46*math.cos(a),y,.79+.40*math.sin(a)) for a in [math.pi-i*math.pi/16 for i in range(17)]]],.07,play_orange,8)
    for x in [-.46,.46]:box('Climber arched panel jamb',(x,y,.42),(.13,.09,.76),play_orange,.035)
    _yard_tubes('Climber magenta overhead bar',[[(-.55,y,1.18),(.55,y,1.18)]],.045,play_pink,8)
for x in [-.56,.56]:
    for y in [-.25,.25]:
        panel=box('Climber shaped blue side panel',(x,y,.66),(.10,.43,.72),play_blue,.095)
        for z in [.80,.91]:box('Climber molded panel rib',(x+(.057 if x>0 else -.057),y,z),(.026,.37,.032),play_blue,.012)
box('Climber pink raised platform',(0,0,.43),(.94,.92,.075),play_pink,.025)
for y in [-.3,-.15,0,.15,.3]:box('Climber platform groove',(0,y,.473),(.85,.012,.007),play_pink,0)
# Lime exit slide is part of this observed foreground structure.
verts=[(x,y,z) for y,z in [(-.48,.48),(-.75,.38),(-1.10,.15),(-1.32,.12)] for x in [-.30,.30]]
_yard_mesh('Climber lime exit slide',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(3)],play_lime)
_yard_tubes('Climber lime slide edges',[[(x,y,z+.04) for y,z in [(-.48,.48),(-.75,.38),(-1.10,.15),(-1.32,.12)]] for x in [-.3,.3]],.04,play_lime,8)

asset('Low tan and lime play piece',(7.7,17.2,yard_z),24,'B0,16–19; H72–75','broad open tan molded frame and lime curved end visible; purpose uncertain; size and orientation estimated')
for y in [-.43,.43]:
    _yard_prism('Tan play frame lower rail',[(-.95,.10),(.85,.10),(.85,.25),(-.95,.25)],.14,play_tan,y)
    _yard_prism('Tan play frame angled side',[(-.95,.10),(-.72,.13),(-.33,.84),(-.47,.98)],.14,play_tan,y)
    _yard_prism('Tan play frame top rail',[(-.47,.80),(.85,.52),(.88,.70),(-.43,.98)],.14,play_tan,y)
    _yard_prism('Tan play frame short end',[(.65,.12),(.86,.12),(.88,.70),(.70,.73)],.14,play_tan,y)
box('Tan play frame cross support',(.3,0,.23),(.22,.86,.12),play_blue,.025)
_yard_tubes('Lime molded curved play end',[[(-.96,y,.12),(-.90,y,.37),(-.67,y,.71),(-.46,y,.87)] for y in [-.42,0,.42]],.12,play_lime,8)

asset('Rear swing frame',(16.5,25.0,yard_z),photos='B11–13',confidence='tubular A-frame and hanging swings visible beside shed; dimensions and seat count estimated')
_yard_tubes('Swing galvanized A frame',[[ (x,-.90,.02),(x,0,2.0),(x,.9,.02)] for x in [-1.45,1.45]]+
            [[(-1.45,0,2.0),(1.45,0,2.0)]],.036,steel,8)
for x in [-.65,.65]:
    _yard_tubes('Swing suspension chains',[[ (x+dx,0,1.98),(x+dx,-.08,.45)] for dx in [-.19,.19]],.009,steel,5)
    box('Swing curved molded seat',(x,-.08,.44),(.46,.23,.06),play_orange,.06)
molded_slide('Backyard toddler slide',(14.7,23.8,yard_z),-10,play_orange)

asset('Rear patio table',(.05,10.5,yard_z),0,'H69; B0,18','rectangular table outside garage-side sunroom glazing; dimensions and placement estimated')
box('Outdoor rectangular tabletop',(0,0,.75),(1.5,.85,.07),walnut)
for x in [-.58,.58]:
    for y in [-.31,.31]:rod('Outdoor table leg',(x,y,0),(x,y,.73),.025,steel)

asset('Small patio playhouse',(-.9,8.8,yard_z),0,'H69; B0,18','cream toy house with mint detail and blue roof next to garage-side patio; dimensions estimated')
for x in [-.52,.52]:box('Toy house side wall',(x,0,.55),(.055,.82,1.1),cream,.018)
for x in [-.39,.39]:box('Toy house front beside doorway',(x,-.41,.55),(.25,.06,1.1),cream,.015)
box('Toy house front doorway header',(0,-.41,1.04),(.55,.06,.13),cream,.025)
_yard_prism('Toy house front gable',[(-.55,1.08),(.55,1.08),(0,1.42)],.06,cream,-.41)
for side in [-1,1]:
    o=box('Toy house blue roof',(side*.29,0,1.27),(.69,1,.045),play_blue,.02);o.rotation_euler.y=side*.53
door=box('Toy house mint half door',(0,-.45,.35),(.50,.05,.65),chair_blue,.075)


def garden_chair(name,pos,angle):
    asset(name,pos,angle,'H69–72; B5,18',confidence='pale blue Adirondack chairs visible on garage-side lawn; size and placement estimated')
    for x in [-.31,.31]:
        _yard_tubes('Garden chair slanted legs',[[ (x,-.29,0),(x,-.27,.50)],[(x,.41,0),(x,.15,.49)]],.035,chair_blue,6)
        box('Garden chair broad arm',(x*1.12,0,.60),(.13,.69,.055),chair_blue,.026)
    for i in range(5):box('Garden chair seat slat',(-.24+i*.12,-.03,.39),(.11,.49,.04),chair_blue,.012)
    for i in range(6):
        x=-.27+i*.108; h=.63-.10*(abs(x)/.27)**2
        o=box('Garden chair rounded fan back',(x,.28,.51+h/2),(.10,.035,h),chair_blue,.035);o.rotation_euler.x=-.18
garden_chair('Rear lawn pale blue chair one',(-3.5,15.3,yard_z),-20)
garden_chair('Rear lawn pale blue chair two',(-1.4,16.0,yard_z),35)
garden_chair('Trampoline nearby pale chair',(12.0,16.1,yard_z),-45)

asset('Lawn firepit and masonry border',(2.3,16.0,yard_z),photos='B0,18–19; H72',confidence='low circular black firepit in small masonry surround visible; sizes estimated')
for x in [-.65,.65]:
    for y in [-.65,0,.65]:box('Firepit masonry side block',(x,y,.06),(.24,.58,.12),concrete,.01)
for y in [-.65,.65]:box('Firepit masonry end block',(0,y,.06),(1.05,.24,.12),concrete,.01)
cylinder('Firepit dark round bowl',(0,0,.22),.50,.25,black,40,top=.58)
_yard_tubes('Firepit rolled rim',[[ (.58*math.cos(a),.58*math.sin(a),.35) for a in [i*math.tau/40 for i in range(41)]]],.025,black,6)
_yard_tubes('Firepit mesh lid ribs',[[ (.52*math.cos(a)*math.cos(t),.52*math.sin(a)*math.cos(t),.36+.22*math.sin(t)) for t in [i*math.pi/16 for i in range(9)]] for a in [i*math.tau/12 for i in range(12)]],.007,black,4)
_yard_tubes('Firepit lid handle',[[(-.07,0,.59),(-.07,0,.65),(.07,0,.65),(.07,0,.59)]],.013,black,6)

asset('Rear sunroom threshold lawn',photos='B0.000/16.007/18.008/19.008',confidence='lawn close to the sunroom sill observed; no four-riser white flight visible; local grade, 12 cm nominal lip and transition extent are route-fit estimates')
# The previous four white risers were a navigation invention. Keep the room
# floor and the yard datum fixed, fitting only the adjoining lawn to a small
# lip below the sill. No metric grade was recovered from the recording.
threshold_z=-.22
def _threshold_grade(y):
    return threshold_z+(yard_z-threshold_z)*max(0,min(1,(y-11.90)/3.30))
for name,y0,y1 in [('Sunroom sill grass landing',11.41,11.90),('Sunroom lawn graded approach',11.90,15.20)]:
    grade=_yard_mesh(name,[(.8,y0,_threshold_grade(y0)),(7.4,y0,_threshold_grade(y0)),
                          (7.4,y1,_threshold_grade(y1)),(.8,y1,_threshold_grade(y1))],[(0,1,2,3)],lawn)
    grade['browser_walk_ramp']='y'
# Small side cells blend the slope to the existing lawn. Separate local
# collision boxes approximate each surface, avoiding one raised AABB across
# the whole bank. Adjacent cell tops differ by <=.15 m, below a normal step.
grade_rows=[11.41,11.90,12.45,13.00,13.55,14.10,14.65,15.20]
for side,inner,outer in [('west',.8,-.4),('east',7.4,8.6)]:
    for i in range(4):
        x0,x1=inner+(outer-inner)*i/4,inner+(outer-inner)*(i+1)/4
        for j,(y0,y1) in enumerate(zip(grade_rows,grade_rows[1:])):
            verts=[(x,y,yard_z+(_threshold_grade(y)-yard_z)*(1-t))
                   for x,y,t in [(x0,y0,i/4),(x1,y0,(i+1)/4),(x1,y1,(i+1)/4),(x0,y1,i/4)]]
            if side=='west':verts.reverse()
            _yard_mesh('Sunroom %s lawn bank %02d %02d'%(side,i,j),verts,[(0,1,2),(0,2,3)],lawn)

# Front porch steps and their short curved drive connection are authored
# together in extensions.py; do not retain the older long forward sweep.
