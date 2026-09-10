"""Second photo set: upstairs rooms. Executed in build.py's Blender namespace.

Local +X follows the photographed bedroom hall: primary left (+Y), nursery
right (-Y), child's bedroom ahead. Homeowner confirmed hall straight from the
stairs and green bathroom immediately left. Dimensions remain estimates.
Photo references U1-U10 always refer to the second upload, not the first set.
"""

UPPER_COLLECTIONS = []
UPPER_ORIGIN = Vector((10.99, 4.01, 1.26))


def upper_collection(name):
    c = collection(name)
    UPPER_COLLECTIONS.append(c)
    return c


blue_wall = material('Nursery dusty blue plaster', (.24, .34, .51), .85, texture='plaster')
bed_wall = material('Upstairs warm grey plaster', (.60, .58, .53), .9, texture='plaster')
mint = material('Bathroom sea green glazed tile', (.16, .43, .32), .26)
darkmint = material('Bathroom dark green accent tile', (.025, .13, .085), .24)
bedding = material('Clean ivory cotton bedding', (.84, .81, .71), .92, texture='fabric')
curtainmat = material('Light grey woven curtains', (.57, .59, .56), .95, texture='fabric')
darkcurtain = material('Charcoal patterned bedroom curtains', (.12, .14, .16), .94, texture='fabric')
ensuite_wall = material('Ensuite cream plaster', (.80, .75, .60), .9)
ensuite_floor = material('Ensuite grey vinyl floor', (.30, .30, .29), .45)
vanity_taupe = material('Ensuite taupe vanity cabinet', (.26, .22, .19), .5)
greyrug = material('Cory light grey plush carpet', (.44, .43, .40), .95, texture='fabric')


def partition(name, a, b, mat=bed_wall, openings=(), height=2.38):
    """Wall along either axis. Openings=(start, end, sill, top), in metres."""
    ax, ay = a
    bx, by = b
    length = math.hypot(bx-ax, by-ay)
    dx, dy = (bx-ax)/length, (by-ay)/length
    def piece(lo, hi, bottom, top, trim=False):
        if hi-lo < .001 or top-bottom < .001:
            return
        o = wallbox(name, (ax+dx*(lo+hi)/2, ay+dy*(lo+hi)/2, (bottom+top)/2),
                    (hi-lo, .15 if trim else .12, top-bottom), white if trim else mat)
        o.rotation_euler.z = math.atan2(dy, dx)
    cursor = 0
    for lo, hi, sill, top in sorted(openings):
        piece(cursor, lo, 0, height)
        piece(lo, hi, 0, sill)
        piece(lo, hi, top, height)
        cursor = hi
    piece(cursor, length, 0, height)
    # Skirting stops at actual doorways.
    cursor = 0
    for lo, hi, sill, top in sorted(openings):
        if sill == 0:
            piece(cursor, lo, 0, .09, True)
            cursor = hi
    piece(cursor, length, 0, .09, True)


def upper_door(name, pos, angle, photos):
    asset(name, pos, angle, photos, 'doorway observed; size estimated')
    for x in [-.46, .46]:
        box('White door architrave', (x, 0, 1.015), (.065, .17, 2.03), white)
    box('White door header', (0, 0, 2.045), (.99, .17, .065), white)
    if name == 'Ensuite doorway':
        # U9 has a tied-back fabric curtain, not a projecting solid door.
        rod('Ensuite doorway curtain pole',(-.48,.08,2.10),(.48,.08,2.10),.012,steel)
        for i in range(9):
            box('Tied-back grey doorway curtain',(.31+i*.017,.09+.02*math.cos(i),1.02),
                (.025,.032,1.99),curtainmat,.008)
    else:
        # Fold the leaf back against the wall to keep the room view open.
        box('Open white door leaf', (-.89, .08, 1), (.84, .045, 2), white)
        sphere('Brass door knob', (-1.22, .12, .98), (.027, .027, .027), brass)


def curtains(name, pos, width, angle, photos, patterned=False):
    asset(name, pos, angle, photos)
    rod('Black curtain pole', (-width/2-.22, -.12, 2.17), (width/2+.22, -.12, 2.17), .018, black)
    for side in [-1, 1]:
        center = side*(width/2-.08)
        verts, faces = [], []
        for j in range(2):
            for i in range(41):
                x = center-.24+i*.012
                verts.append((x, -.16+.04*math.cos(i*math.pi/4), .10+j*2.02))
        for i in range(40):
            faces.append((i, i+1, i+42, i+41))
        mesh = bpy.data.meshes.new('Soft curtain folds')
        mesh.from_pydata(verts, [], faces)
        finish(bpy.data.objects.new('Hanging curtain panel', mesh), 'Hanging curtain panel', darkcurtain if patterned else curtainmat)
        for i in range(5):
            x = center-.20+i*.10
            curve('Curtain ring', [(x+.027*math.cos(t*math.tau/20), -.12, 2.15+.027*math.sin(t*math.tau/20)) for t in range(21)], .006, black, True)
        if patterned:
            for col in range(3):
                for row in range(12):
                    cx, cz = center-.16+col*.16, .18+row*.16
                    curve('White trellis curtain pattern', [(cx+(.045+.012*math.cos(4*t))*math.cos(t), -.207,
                          cz+(.060+.012*math.cos(4*t))*math.sin(t)) for t in [k*math.tau/32 for k in range(33)]], .004, bedding, True)


def upper_window(name, pos, width, angle, photos, patterned=False, with_curtains=True):
    window(name, pos, width, 1.30, angle, False, False)
    ROOT['reference_photos'] = photos
    ASSETS[-1]['photos'] = photos
    # Closed pleated blinds, as photographed, with a narrow daylight rim.
    for i in range(51):
        box('Closed pleated shade', (0, -.06, -.63+i*.025), (width-.04, .023, .022), white, .002)
    if with_curtains:
        curtains(name+' curtains', (pos[0], pos[1], 0), width, angle, photos, patterned)


def soft_bedding(name, pos, size, mat, kind='pillow', nx=20, ny=30, palette=None):
    """Closed sewn forms with a thin edge and gentle, deterministic cloth folds.

    Silhouette is actual geometry, so browser export retains it. This models
    clean bedding, not the recording-time arrangement of loose blankets.
    """
    width, depth, height = size
    verts, faces = [], []
    for side in [1, -1]:
        for j in range(ny+1):
            v = 2*j/ny-1
            for i in range(nx+1):
                u = 2*i/nx-1
                corner = abs(u*v)**8
                x, y = width*u/2*(1-.035*corner), depth*v/2*(1-.035*corner)
                if kind == 'duvet':
                    side_drop = .18*(max(0, abs(u)-.8)/.2)**2
                    foot_drop = .20*(max(0, -v-.8)/.2)**2
                    wave = (.009*math.sin(15*u+3*v)+.007*math.sin(22*v-5*u)
                            +.012*math.sin(7*u-4*v))*(1-.55*abs(u*v))
                    z = wave-max(side_drop, foot_drop)+side*height/2
                else:
                    power = 10 if kind == 'mattress' else 3
                    crown = max(0, (1-abs(u)**power)*(1-abs(v)**power))
                    edge = .66 if kind == 'mattress' else .15
                    loft = edge+(1-edge)*math.sqrt(crown)
                    amplitude = .0025 if kind == 'mattress' else .004
                    wave = amplitude*(math.sin(23*u+7*v)+.5*math.sin(19*v-3*u))*abs(u*v)**2
                    z = side*height*loft/2+wave
                verts.append((x, y, z))
    stride, surface = nx+1, (nx+1)*(ny+1)
    for j in range(ny):
        for i in range(nx):
            a = j*stride+i
            top = (a, a+1, a+stride+1, a+stride)
            faces.append(top)
            faces.append(tuple(surface+k for k in reversed(top)))
    perimeter = (list(range(nx+1)) + [j*stride+nx for j in range(1,ny+1)]
                 + [ny*stride+i for i in range(nx-1,-1,-1)]
                 + [j*stride for j in range(ny-1,0,-1)])
    for i,a in enumerate(perimeter):
        b = perimeter[(i+1)%len(perimeter)]
        faces.append((a, a+surface, b+surface, b))
    mesh = bpy.data.meshes.new(name+' sewn mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = pos
    finish(obj, name, mat)
    for polygon in mesh.polygons:polygon.use_smooth = True
    if palette:
        mesh.materials.clear()
        for color in palette:mesh.materials.append(color)
        for polygon in mesh.polygons:
            col = min(5,max(0,int((polygon.center.x/width+.5)*6)))
            row = min(2,max(0,int((polygon.center.y/depth+.5)*3)))
            polygon.material_index = (col+row*2)%len(palette)
    return obj


def bed(name, pos, width, angle, photos, quilt=False, duvet=False):
    asset(name, pos, angle, photos)
    box('Simple dark bed base', (0, 0, .27), (width, 2.04, .14), walnut, .035)
    for x in [-width/2+.07, width/2-.07]:
        for y in [-.88, .88]:
            box('Bed leg', (x, y, .13), (.05, .05, .26), black)
    # H123/H186 show a fitted white surface, not a second mattress-like slab.
    soft_bedding('White mattress', (0, 0, .43), (width, 2, .25), bedding, 'mattress')
    if duvet:
        # H139: the main bed has a loose pale duvet falling over its sides/foot.
        soft_bedding('Soft draped duvet', (0, -.20, .605), (width+.18, 1.74, .018),
                     bedding, 'duvet', 26, 38)
    for x in ([0] if width < 1.3 else [-width*.24, width*.24]):
        soft_bedding('Made bed pillow', (x, .65, .60),
                     (width*.43 if width>1.3 else .70, .43, .16), bedding, nx=14, ny=10)
    if quilt:
        colors = [material('Cory quilt cotton '+label, color, .93, texture='fabric')
                  for label,color in [('crimson',(.42,.06,.045)),('blue',(.04,.09,.20)),
                                      ('green',(.07,.20,.09)),('ochre',(.55,.30,.06)),
                                      ('purple',(.18,.055,.14))]]
        soft_bedding('Folded colorful patchwork quilt', (0,-.62,.573),
                     (width+.02,.48,.026), colors[0], 'quilt', 24, 12, colors)


def white_chest(name, pos, width, height, photos):
    chest(name, pos, width, height, 0, 5, 1, photos)
    for o in ROOT.children:
        if o.type == 'MESH' and 'knob' not in o.name.lower():
            o.data.materials.clear()
            o.data.materials.append(white)


upper_collection('17 | Upstairs floors and hall')
asset('Upstairs oak hallway', photos='U10', confidence='hall straight and bathroom left confirmed by homeowner; dimensions estimated')
box('Hall floor slab', (2.25, 0, -.09), (4.5, 1.1, .18), white)
for i in range(6):
    box('Hall oak floorboard', (2.25, -.46+i*.184, .012), (4.5, .18, .026), oak, .001)
asset('Hall door openings and hooks', photos='U10')
partition('Hall north partition', (0, .55), (4.5, .55), openings=[(.15, 1.01, 0, 2.06), (2.05, 2.91, 0, 2.06)])
partition('Hall south partition', (0, -.55), (4.5, -.55), openings=[(1.08, 1.94, 0, 2.06)])
partition('Hall end bedroom wall', (4.5, -.55), (4.5, .55), openings=[(.12, .98, 0, 2.06)])
upper_door('Family bathroom doorway', (.58, .55, 0), 0, 'U3,U5')
upper_door('Primary bedroom doorway', (2.48, .55, 0), 0, 'U8,U10')
upper_door('Blue nursery doorway', (1.51, -.55, 0), 180, 'U6,U10')
upper_door('End bedroom doorway', (4.5, 0, 0), -90, 'U7,U10')
asset('Hall wall hook rail', (3.65, -.47, 1.43), 180, 'U10')
box('Oak hook board', (0, 0, 0), (.85, .04, .14), oak)
for i in range(7):
    curve('Empty black coat hook', [(-.35+i*.115, -.03, .015), (-.35+i*.115, -.08, -.07),
          (-.35+i*.115, -.13, -.07), (-.35+i*.115, -.15, -.015)], .008, black)

# Floor rectangles meet the hall openings, with no slab across the stair void.
UPPER_ROOMS = {
    'Family bathroom': (-1.15, 1.25, .55, 3.13, tilewhite),
    'Primary bedroom': (1.25, 4.5, .55, 4.55, carpet),
    'Blue nursery': (0, 4.5, -3.65, -.55, carpet),
    'End bedroom': (4.5, 7.85, -3.65, 2.45, oak),
    'Ensuite shower room': (-1.15, 1.25, 3.13, 4.55, ensuite_floor),
}
for name, (x0,x1,y0,y1,mat) in UPPER_ROOMS.items():
    asset(name+' floor', photos={'Family bathroom':'U3-U5','Primary bedroom':'U8','Blue nursery':'U6',
          'End bedroom':'U7','Ensuite shower room':'U9'}[name], confidence='room observed; footprint estimated')
    box(name+' slab', ((x0+x1)/2,(y0+y1)/2,-.085), (x1-x0,y1-y0,.17), white)
    box(name+' finish', ((x0+x1)/2,(y0+y1)/2,.014), (x1-x0,y1-y0,.025), mat)

upper_collection('18 | Upstairs bedroom walls and windows')
asset('Blue nursery enclosure', photos='U6')
partition('Nursery blue rear wall', (0,-3.65),(4.5,-3.65),blue_wall,[(1.12,2.42,.77,2.07)])
partition('Nursery blue left wall', (0,-3.65),(0,-.55),blue_wall)
partition('Nursery blue right wall', (4.5,-3.65),(4.5,-.55),blue_wall,
          [(.03,1.22,0,2.05),(1.55,2.55,0,2.12)])
# House Tour 126/129s reveals a closet behind Cory's bed headboard. Its depth
# into the adjoining room is estimated; the video establishes the opening.
asset('Cory headboard closet enclosure',photos='House Tour 126/129s',confidence='opening and adjacency observed; .65 m depth estimated')
partition('Closet recessed back',(3.85,-3.62),(3.85,-2.43),blue_wall)
partition('Closet south return',(3.85,-3.62),(4.50,-3.62),blue_wall)
partition('Closet north return',(3.85,-2.43),(4.50,-2.43),blue_wall)
# The shared partition has blue paint on the nursery side and warm white on
# Cory's side (H111 versus H126). Keep one physical wall with separate finishes.
for obj in COLL.objects:
    if obj.type!='MESH':continue
    wall_name=obj.name
    if not wall_name.startswith(('Nursery blue right wall','Closet recessed back','Closet south return','Closet north return')):continue
    obj.data.materials.append(bed_wall)
    for face in obj.data.polygons:
        normal=obj.rotation_euler.to_matrix() @ face.normal
        inside=(normal.x>.5 or ('Closet south return' in wall_name and normal.y>.5)
                or ('Closet north return' in wall_name and normal.y<-.5))
        if inside:face.material_index=len(obj.data.materials)-1
asset('Nursery wardrobe enclosure',photos='House Tour 115/116s',
      confidence='nursery-facing closet on shared sidewall observed; depth .58 m estimated')
partition('Nursery wardrobe back',(5.08,-2.10),(5.08,-1.10),bed_wall,height=2.20)
partition('Nursery wardrobe south return',(4.50,-2.10),(5.08,-2.10),bed_wall,height=2.20)
partition('Nursery wardrobe north return',(4.50,-1.10),(5.08,-1.10),bed_wall,height=2.20)
upper_window('Nursery window', (1.77,-3.64,1.42),1.30,180,'U6')
asset('Primary bedroom enclosure', photos='U8,U9')
# Ensuite doorway beside the closet (U9, V1); the ensuite lies beyond this wall.
partition('Primary left wall', (1.25,.55),(1.25,4.55),openings=[(3.05,3.91,0,2.06)])
partition('Primary far wall', (1.25,4.55),(4.5,4.55),openings=[(1.03,2.08,.77,2.07)])
partition('Primary right window wall', (4.5,.55),(4.5,4.55),openings=[(2.1,3.4,.77,2.07)])
upper_window('Primary right window',(4.49,3.3,1.42),1.30,-90,'U8')
upper_window('Primary far window',(2.805,4.54,1.42),1.05,0,'U8')
upper_door('Ensuite doorway',(1.25,4.03,0),90,'U9')
asset('End bedroom enclosure',photos='U7,U10')
partition('End bedroom far wall',(7.85,-3.65),(7.85,2.45),openings=[(4.25,5.55,.77,2.07)])
partition('End bedroom south wall',(4.5,-3.65),(7.85,-3.65),openings=[(1.7,2.9,.77,2.07)])
partition('End bedroom north wall',(4.5,2.45),(7.85,2.45))
# The nursery and primary walls already form these two shared wall segments.
upper_window('End bedroom trellis window',(7.84,1.25,1.42),1.30,-90,'U7,U10',True)
upper_window('End bedroom side window',(6.80,-3.64,1.42),1.20,180,'U7; House Tour 3/123s')

upper_collection('19 | Blue nursery furniture')
# Nursery is viewed toward -Y, so camera-left is +X. Wood chest left,
# white chest right of the window, and crib on the right hand side wall.
chest('Nursery wood drawer chest',(3.25,-3.30,0),.85,1.25,180,5,1,'U6')
white_chest('Nursery white tall chest',(.73,-3.29,0),.86,1.35,'U6')
ROOT.rotation_euler.z = math.pi
asset('Nursery drawer organizer',(.73,-3.28,1.38),180,'U6')
box('Black organizer frame',(0,0,.33),(.70,.41,.66),black)
for i in range(3):
    box('Frosted closed storage drawer',(0,-.22,.12+i*.215),(.64,.045,.19),curtainmat)
    box('Organizer drawer pull',(0,-.25,.16+i*.215),(.15,.035,.025),white)
asset('White slatted nursery crib',(.56,-1.91,0),90,'U6')
box('Crib mattress platform',(0,0,.34),(1.40,.75,.12),white)
box('Clean crib mattress',(0,0,.43),(1.34,.69,.10),bedding,.035)
for x in [-.70,.70]:
    for y in [-.38,.38]:
        box('Crib corner post',(x,y,.56),(.065,.065,1.12),white)
for y in [-.38,.38]:
    for z in [.28,.98]:
        box('Crib long rail',(0,y,z),(1.43,.05,.065),white)
    for i in range(17):
        box('Crib vertical slat',(-.65+i*.081,y,.63),(.025,.028,.68),white,.005)
for x in [-.70,.70]:
    for z in [.28,1.09]:
        box('Crib end rail',(x,0,z),(.05,.80,.075),white)
    for i in range(8):
        box('Crib end slat',(x,-.32+i*.092,.67),(.028,.023,.76),white,.005)
asset('Wood nursery rocking chair',(2.10,-2.68,0),180,'U6')
for x in [-.28,.28]:
    curve('Curved rocking runner',[(x,-.50+i*.05,.07+.25*(-.50+i*.05)**2) for i in range(21)],.030,walnut)
    for y in [-.24,.24]:
        rod('Rocker support',(x,y,.09),(x*.87,y,.44),.022,walnut)
    rod('Rocker arm post',(x,-.23,.42),(x,-.23,.70),.018,walnut)
    curve('Rocker wooden arm',[(x,-.36,.71),(x,-.20,.73),(x,.30,.71)],.032,walnut)
box('Rocker seat',(0,0,.46),(.59,.58,.075),oak,.045)
box('Olive padded rocker seat',(0,-.02,.53),(.53,.50,.10),linen,.06)
for i in range(7):
    rod('Rocking chair spindle',(-.26+i*.087,.25,.48),(-.28+i*.093,.31,1.18),.013,walnut)
curve('Arched rocking chair back',[(-.33*math.cos(t),.31,1.04+.25*math.sin(t)) for t in [i*math.pi/24 for i in range(25)]],.025,walnut)
box('Tall olive rocker cushion',(0,.24,.86),(.48,.10,.59),linen,.07)
table('Nursery upholstered footstool',(2.84,-2.44,0),(.49,.41,.36),walnut,photos='U6')
box('Footstool cushion',(0,0,.385),(.52,.44,.075),linen,.055)
asset('Nursery wardrobe rail and storage',(4.80,-1.60,0),-90,'House Tour 115/116s')
box('Nursery wardrobe high shelf',(0,0,1.94),(.94,.50,.035),white)
rod('Nursery wardrobe clothes rail',(-.45,-.02,1.76),(.45,-.02,1.76),.015,steel)
for x in [-.23,.23]:
    for z in [.16,.45]:
        box('Nursery stacked storage bin',(x,.02,z),(.42,.43,.26),bluegrey,.024)
        box('Nursery bin lid',(x,.02,z+.14),(.43,.45,.025),white,.006)
for i in range(5):
    x=-.33+i*.16
    curve('Nursery clothes hanger',[(x-.07,-.02,1.63),(x,-.02,1.72),(x+.07,-.02,1.63),(x-.07,-.02,1.63)],.005,white)
    box('Hanging nursery garment',(x,-.02,1.31),(.145,.055,.60),[bedding,bluegrey,linen][i%3],.035)

upper_collection('20 | End bedroom furniture')
# U7: the visible free end of the mattress is beside the ottoman; its long
# edge follows the right window wall. The head is toward the entrance, hidden
# by the near door jamb. It does not project across the middle of the rug.
asset('End bedroom large grey rug',(6.15,-.85,.035),0,'U7; House Tour 120/123s')
box('Grey area rug',(0,0,0),(2.85,5.15,.025),greyrug,.012)
bed('End bedroom single bed',(5.75,-3.05,.035),1.03,90,'U7; House Tour 123/126s',True)
cory_pink=material('Cory muted pink cotton pillow',(.48,.27,.29),.94,texture='fabric')
for obj in list(ROOT.children):
    if obj.name.startswith('Made bed pillow'):bpy.data.objects.remove(obj,do_unlink=True)
for x,mat in [(-.23,bedding),(.23,cory_pink)]:
    soft_bedding('Cory cream and rose pillows',(x,.66,.60),(.48,.44,.16),mat,nx=14,ny=10)
box('Cory wood headboard',(0,1.01,.79),(1.06,.07,.72),oak,.04)
for x in [-.55,.55]:
    cylinder('Cory turned bedpost',(x,1.01,.63),.035,1.26,walnut)
    sphere('Cory round bedpost finial',(x,1.01,1.29),(.060,.060,.060),oak)
asset('Cory closet shelves and curtain',(4.18,-3.025,0),90,'House Tour 126/129s')
box('Closet high shelf',(0,0,1.80),(1.10,.55,.035),white)
rod('Closet hanging pole',(-.53,-.09,1.66),(.53,-.09,1.66),.014,steel)
for z in [.24,.62,1.00,1.38]:box('Closet side shelf',(-.39,0,z),(.30,.55,.025),white)
for i in range(10):
    box('Bunched closet curtain',(-.48+i*.018,-.30+.025*math.cos(i),1.02),(.024,.035,1.96),bedding,.007)
chest('End bedroom wooden desk drawers',(5.18,1.95,0),.95,.76,0,3,1,'U7')
table('End bedroom writing desktop',(5.37,1.91,0),(1.4,.61,.79),oak,photos='U7')
asset('Tall narrow dark bookcase',(7.51,-.67,0),-90,'U7')
for x in [-.44,.44]:
    box('Bookcase upright',(x,0,1.04),(.045,.25,2.08),walnut)
box('Bookcase back',(0,.115,1.04),(.88,.025,2.08),walnut)
for i in range(13):
    box('Closely spaced shelf',(0,0,.06+i*.167),(.88,.26,.025),walnut)
sofa('End bedroom corner ottoman',(7.26,-3.25,0),.55,linen,0,'U7')
# Ottoman has no back/arms in the source.
for o in list(ROOT.children):
    if any(token in o.name for token in ['back','Arm']):
        bpy.data.objects.remove(o,do_unlink=True)
asset('Empty corner toy hammock',(7.58,-3.38,1.91),0,'U7')
for i in range(10):
    t=i/9
    curve('Hammock woven cord',[(0,.72*t,.20),(-.60*(1-t),.70*t,-.22),(-.66,0,.20)],.004,bedding)
asset('Wall mounted climbing handles',(7.74,.05,0),-90,'U7')
for x,z in [(-.24,.65),(0,1.05),(.24,1.54)]:
    curve('Green wall grab handle',[(x,-.03,z-.11),(x,-.10,z-.09),(x,-.11,z+.09),(x,-.03,z+.11)],.018,darkmint)

upper_collection('21 | Primary bedroom furniture')
# U8: pillows at the right-hand wall; dresser and TV on the adjoining wall.
bed('Primary double bed',(3.43,2.40,.025),1.60,-90,'U8,V1; House Tour 139s',duvet=True)
primary_headboard=material('Primary grey cotton headboard',(.23,.25,.235),.94,texture='fabric')
headboard=soft_bedding('Primary upholstered headboard',(0,.95,.84),
                      (1.67,.76,.095),primary_headboard,nx=22,ny=12)
headboard.rotation_euler.x=math.pi/2
asset('Primary bedside wall shelves',(4.47,1.98,0),-90,'House Tour 139s',
      confidence='wall shelves observed; count, spacing and plain storage contents estimated')
for z in [1.47,1.87]:
    box('Primary wall shelf board',(0,-.10,z),(1.08,.24,.03),oak,.009)
    for x in [-.41,.41]:
        box('Primary shelf upright bracket',(x,.007,z-.10),(.025,.025,.22),white,.003)
        box('Primary shelf support arm',(x,-.09,z-.04),(.025,.21,.025),white,.003)
for i in range(4):
    box('Plain bedside shelf storage',(-.38+i*.245,-.10,1.60),(.20,.17,.22),
        [linen,bluegrey,curtainmat,white][i],.008)
chest('Primary long wood dresser',(3.66,4.22,0),1.42,1.02,0,3,2,'U8')
chest('Primary narrow wood chest',(2.56,3.77,0),.63,.82,0,4,1,'U8')
asset('Primary wall television',(3.65,4.46,1.62),0,'U8')
box('Television black case',(0,0,0),(1.05,.07,.64),black)
box('Television dark screen',(0,-.041,0),(.99,.012,.58),screen)
asset('Primary woven laundry hamper',(3.15,3.55,0),0,'U8')  # between dresser zones, clear of the ensuite doorway
box('Woven hamper body',(0,0,.39),(.43,.40,.78),wicker,.04)
box('Closed wicker hamper lid',(0,0,.81),(.46,.43,.055),rattan,.025)
box('Hamper inset grip',(0,-.207,.69),(.12,.007,.035),black)
asset('Bedside mesh bassinet',(2.13,2.15,0),90,'U8,V1; House Tour 138/139s',
      confidence='beside entry half of bed foot observed; fitted position preserves narrow foot aisle')
for x in [-.44,.44]:
    for y in [-.24,.24]:
        rod('Bassinet folding leg',(x*1.12,y*1.2,.03),(x*.90,y*.85,.72),.022,curtainmat)
box('Bassinet mattress',(0,0,.43),(.84,.48,.07),bedding,.065)
for y in [-.27,.27]:
    box('Bassinet fabric mesh side',(0,y,.58),(.91,.012,.28),curtainmat,.01)
    rod('Bassinet white side rail',(-.46,y,.75),(.46,y,.75),.035,white)
for x in [-.46,.46]:
    box('Bassinet mesh end',(x,0,.58),(.012,.54,.28),curtainmat,.01)
    rod('Bassinet end rail',(x,-.27,.75),(x,.27,.75),.035,white)
asset('Primary white ceiling fan',(3.0,2.70,2.22),0,'U8')
cylinder('White fan motor',(0,0,0),.15,.16,white)
for i in range(4):
    a=i*math.pi/2
    o=box('White fan blade',(.38*math.cos(a),.38*math.sin(a),.015),(.62,.13,.022),white)
    o.rotation_euler.z=a
for x,y in [(-.10,0),(.10,0),(0,.10)]:
    cylinder('Frosted fan lamp',(x,y,-.15),.07,.13,tilewhite,top=.10)

upper_collection('22 | Family bathroom fixtures')
asset('Family bathroom plaster enclosure',photos='U3-U5')
partition('Bath left wall',(-1.15,.55),(-1.15,3.13),white)
partition('Bath back wall',(-1.15,3.13),(1.25,3.13),white)
# Primary left wall is the shared partition; avoid coincident duplicate surfaces.
partition('Bath entry return',(-1.15,.55),(0,.55),white)
asset('Family bathroom patterned tile floor',photos='U3,U4')
for ix in range(8):
    for iy in range(9):
        x,y=-1.00+ix*.30,.70+iy*.30
        box('Grey bathroom square tile',(x,y,.033),(.294,.294,.012),tilegrey,.002)
        curve('Ivory bathroom quatrefoil',[(x+(.084+.022*math.cos(4*t))*math.cos(t),y+(.084+.022*math.cos(4*t))*math.sin(t),.042)
              for t in [k*math.tau/48 for k in range(49)]],.007,tilewhite,True)


basin_inner=material('Cool porcelain bowl interior',(.60,.69,.65),.28)


def basin(name, center, width, depth, rim_z, bottom_z, mat):
    """Open bowl with rounded rectangular rings, no solid block filling it."""
    x,y=center
    verts=[]
    for w,d,z in [(width,depth,rim_z),(width*.84,depth*.78,rim_z-.02),(width*.57,depth*.50,bottom_z)]:
        for i in range(64):
            t=i*math.tau/64
            c,s=math.cos(t),math.sin(t)
            verts.append((x+w/2*math.copysign(abs(c)**.5,c),y+d/2*math.copysign(abs(s)**.5,s),z))
    faces=[(j*64+i,j*64+(i+1)%64,(j+1)*64+(i+1)%64,(j+1)*64+i) for j in range(2) for i in range(64)]
    faces.append(tuple(range(128,192)))
    mesh=bpy.data.meshes.new(name+' open basin')
    mesh.from_pydata(verts,[],faces)
    o=finish(bpy.data.objects.new(name,mesh),name,mat)
    mesh.materials.append(basin_inner)
    mesh.polygons[-1].material_index=1
    for p in mesh.polygons:p.use_smooth=True
    cylinder(name+' drain',(x,y,bottom_z+.006),.028,.008,steel)
    return o


asset('White bathroom vanity',(-.82,1.65,0),90,'U3,U5')
box('White vanity cabinet',(0,0,.40),(1.20,.52,.80),white)
for x in [-.39,0,.39]:
    panel('Vanity cupboard door',x,-.28,.39,.37,.64,white)
    sphere('Black vanity knob',(x,-.32,.60),(.018,.018,.018),black)
# Counter rim leaves a real opening for the inset sink.
for x in [-.47,.47]:box('Vanity stone side',(x,0,.83),(.30,.58,.045),counter)
for y in [-.25,.25]:box('Vanity stone edge',(0,y,.83),(.66,.08,.045),counter)
basin('Inset vanity sink',(0,0),.64,.45,.845,.67,tilewhite)
curve('Chrome vanity faucet',[(0,.23,.86),(0,.23,1.00),(0,.10,1.03),(0,.05,.97)],.017,steel)
for x in [-.12,.12]:
    cylinder('Vanity faucet handle',(x,.22,.885),.024,.055,steel)
frame('Large vanity mirror',(0,.27,1.46),1.15,.97,white,mirror)
asset('Bathroom recessed linen shelves',(-.87,.86,0),90,'U5; House Tour 104–106s',
      'cased linen closet beside entrance observed; enclosure dimensions estimated')
for x in [-.25,.25]:
    box('Linen closet white side',(x,0,1.06),(.035,.48,2.12),white)
    box('Linen closet casing',(x,-.26,1.06),(.055,.055,2.16),white)
box('Linen closet back',(0,.225,1.06),(.53,.025,2.12),white)
box('Linen closet cased header',(0,-.26,2.12),(.56,.055,.065),white)
for z in [.25,.68,1.11,1.54,1.97]:box('Linen shelf',(0,0,z),(.48,.44,.035),white)
for z in [.73,.80,1.16,1.23,1.59]:box('Folded linen towel',(0,-.02,z),(.38,.34,.06),bedding,.025)
asset('Family bathroom toilet',(-.70,2.49,0),90,'U3')
box('Toilet pedestal',(0,0,.20),(.27,.38,.40),tilewhite,.11)
basin('Toilet bowl',(0,-.07),.39,.56,.43,.27,tilewhite)
box('Toilet cistern',(0,.26,.67),(.40,.18,.47),tilewhite,.055)
box('Cistern lid',(0,.26,.92),(.43,.21,.035),tilewhite,.025)
asset('Green tile bathtub',( .85,2.10,0),0,'U3,U4')
box('White tub front apron',(-.37,0,.25),(.07,1.80,.50),tilewhite,.035)
basin('White bathtub',(0,0),.79,1.81,.55,.16,tilewhite)
# Right wall and far tap wall: sea green tile, ivory repair patch, pale accent band.
for iz in range(13):
    for iy in range(12):
        mat=mint if iz<10 else (darkmint if (iy+iz)%5==0 else counter)
        box('Bath long wall ceramic tile',(.386,-.825+iy*.15,.625+iz*.15),(.016,.145,.145),mat,.002)
    for ix in range(5):
        mat=tilewhite if iz<3 else (mint if iz<10 else (darkmint if (ix+iz)%4==0 else counter))
        box('Bath tap wall ceramic tile',(-.30+ix*.15,.89,.625+iz*.15),(.145,.016,.145),mat,.002)
for x in [-.17,.17]:
    rod('Tub chrome valve',(x,.86,.90),(x,.78,.90),.034,steel)
curve('Tub chrome spout',[(0,.86,.81),(0,.72,.81),(0,.67,.75)],.029,steel)
rod('Chrome shower curtain rail',(-.40,-.95,2.16),(-.40,.96,2.16),.017,steel)
for i in range(13):
    box('Gathered white shower curtain',(-.41+.027*math.sin(i),-.90+i*.025,1.22),(.03,.034,1.85),bedding,.009)
asset('Bathroom wall hook strip',(.05,3.04,1.30),0,'U3')
box('White bathroom hook board',(0,0,0),(.93,.035,.09),white)
for x in [-.36,-.18,0,.18,.36]:
    curve('Empty bathroom hook',[(x,-.03,.02),(x,-.08,-.04),(x,-.11,.02)],.009,steel)

upper_collection('23 | Ensuite shower room')
# Built entry-first along +y, 1.3 m wide: window on the right wall, vanity and
# toilet on the left wall (back to back with the family bathroom), shower at
# the far end. Then turned to run west from the primary bedroom's closet wall.
asset('Ensuite enclosure',photos='U9,V2,ensuite',confidence='shower straight ahead and window right of the doorway observed; width estimated')
partition('Ensuite right wall',(2.55,4.55),(2.55,6.95),ensuite_wall,[(.45,1.25,.90,2.12)])
partition('Ensuite far wall',(1.25,6.95),(2.55,6.95),ensuite_wall)
partition('Ensuite left wall',(1.25,4.55),(1.25,6.95),ensuite_wall)
upper_window('Ensuite window',(2.54,5.40,1.51),.80,-90,'V2,ensuite',with_curtains=False)
asset('Ensuite shower tray',(1.9,6.52,0),0,'U9,ensuite')
basin('Ivory shower tray',(0,0),1.22,.86,.17,.065,tilewhite)
box('Molded shower back panel',(0,.43,1.16),(1.23,.025,2.17),tilewhite)
for x in [-.615,.615]:box('Molded shower side',(x,0,1.16),(.025,.86,2.17),tilewhite)
curve('Ensuite shower neck',[(-.42,.41,1.91),(-.42,.17,2.0),(-.42,.08,1.93)],.016,steel)
sphere('Round chrome shower head',(-.42,.08,1.91),(.075,.075,.027),steel)
rod('Ensuite curtain rod',(-.615,-.44,2.15),(.615,-.44,2.15),.014,steel)
for i in range(11):
    box('Gathered ivory shower curtain',(-.57+i*.022,-.45+.025*math.cos(i),1.14),(.03,.04,1.92),bedding,.008)
asset('Ensuite grey bath mat',(1.9,6.12,.034),0,'U9')
box('Clean rectangular bath mat',(0,0,0),(1.10,.46,.035),curtainmat,.015)

asset('Ensuite small vanity',(1.54,5.20,0),90,'V2,ensuite')
box('Ensuite vanity base',(0,0,.40),(.62,.48,.80),vanity_taupe)
panel('Ensuite raised cupboard',0,-.25,.39,.55,.62,vanity_taupe)
sphere('Ensuite black knob',(.20,-.29,.60),(.018,.018,.018),black)
basin('Ensuite ivory sink',(0,0),.66,.51,.84,.68,tilewhite)
curve('Ensuite chrome basin faucet',[(0,.23,.87),(0,.23,.98),(0,.07,1.01),(0,.03,.95)],.016,steel)
frame('Ensuite vanity mirror',(0,.25,1.48),.63,.98,white,mirror)
asset('Ensuite toilet',(1.55,5.80,0),90,'V2,ensuite')
box('Ensuite toilet pedestal',(0,0,.19),(.26,.36,.38),tilewhite,.10)
basin('Ensuite toilet bowl',(0,-.07),.38,.55,.43,.27,tilewhite)
box('Ensuite toilet tank',(0,.22,.65),(.38,.17,.44),tilewhite,.05)
asset('Ensuite empty wall storage',(1.32,5.80,1.40),90,'V2,ensuite')
for z in [0,.26]:
    box('Wall basket shelf',(0,-.10,z),(.58,.21,.025),black,.005)
    rod('Basket front rail',(-.29,-.21,z+.10),(.29,-.21,z+.10),.009,black)
    for x in [-.28,0,.28]:rod('Basket upright',(x,-.21,z),(x,-.21,z+.10),.005,black)

# Turn the room to run west from the primary bedroom's closet wall, back to
# back with the family bathroom: entering it, the window is on the right in
# the wing's rear wall and the fixtures on the left, as the interior
# photographs show, and the rear wall stays flush as the exterior shows.
bpy.context.view_layer.update()
turn = Matrix.Translation((5.8, 2.0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Z')
for obj in bpy.data.collections['23 | Ensuite shower room'].objects:
    if obj.parent is None:
        obj.matrix_world = turn @ obj.matrix_world

# Additional reverse angle V1 reveals the entry-side closet and two drawer units.
COLL=bpy.data.collections['21 | Primary bedroom furniture']
asset('Primary open closet',(1.65,.84,0),180,'V1', 'closet observed; width constrained by estimated room shell')
for x in [-.36,.36]:box('Closet side panel',(x,0,1.06),(.05,.48,2.12),white)
box('Closet top shelf',(0,0,1.83),(.74,.47,.035),white)
rod('Empty closet hanging rail',(-.34,0,1.66),(.34,0,1.66),.017,steel)
box('Closet curtain pole',(0,-.28,2.16),(.84,.03,.03),black)
chest('Primary closet wood drawers',(1.62,.85,0),.51,1.01,180,4,1,'V1')
white_chest('Primary closet white drawer tower',(1.88,.87,0),.23,.61,'V1')
ROOT.rotation_euler.z=math.pi
chest('Primary entry-side wood chest',(3.87,.87,0),1.0,1.06,180,4,1,'V1')

upper_ceilings=upper_collection('24 | Upstairs ceilings - hidden for dollhouse')
asset('Upper room ceilings',photos='U3,U6-U10')
for name,(x0,x1,y0,y1,mat) in UPPER_ROOMS.items():
    box(name+' ceiling',((x0+x1)/2,(y0+y1)/2,2.43),(x1-x0,y1-y0,.10),white)
box('Hall ceiling',(2.25,0,2.43),(4.5,1.1,.10),white)

# Move every upper room root together to the existing upper landing elevation.
bpy.context.view_layer.update()
for c in UPPER_COLLECTIONS:
    for obj in c.objects:
        if obj.parent is None:
            obj.location += UPPER_ORIGIN
