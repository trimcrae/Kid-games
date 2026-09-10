"""Fourth upload W1-W10: garage, basement and an additional lower bedroom.

Room sizes and service runs are schematic. W9 establishes the basement stair
beside the existing return to the main floor. W3 establishes kitchen/garage access.
"""
NEW_COLLECTIONS=[]
BASEMENT_Z=-3.15

def new_collection(name):
    c=collection(name)
    NEW_COLLECTIONS.append(c)
    return c

def shelf_unit(name,pos,width,height,mat=oak,angle=0,photos='W5,W6'):
    asset(name,pos,angle,photos)
    for x in [-width/2,width/2]:box('Storage shelf side',(x,0,height/2),(.05,.38,height),mat)
    box('Storage shelf back',(0,.18,height/2),(width,.024,height),mat)
    for i in range(5):box('Empty storage shelf',(0,0,.06+i*(height-.1)/4),(width,.40,.035),mat)

def framed_opening(name,pos,width,height,angle=0,photos='W1-W3'):
    asset(name,pos,angle,photos)
    for x in [-width/2,width/2]:box('Door frame upright',(x,0,height/2),(.07,.16,height),white)
    box('Door frame header',(0,0,height),(width+.07,.16,.07),white)

concrete_new=material('Garage and basement concrete',(.34,.35,.33),.92,texture='stone')
blockmat=material('Painted foundation blocks',(.62,.64,.58),.94,texture='stone')
joistmat=material('Exposed timber joists',(.20,.10,.045),.87,texture='wood')
burgundy=material('Burgundy vehicle paint',(.12,.022,.027),.22,.35)
carblack=material('Black vehicle paint',(.015,.021,.024),.20,.50)
pinkcloth=material('Rose bedroom curtains',(.48,.17,.16),.97,texture='fabric')
pinkwood=material('Pink childrens shelving',(.48,.035,.16),.55)
utilityplastic=material('Gray molded utility plastic',(.29,.32,.32),.59)
bikeblack=material('Exercise bike black finish',(.018,.021,.022),.42,.15)

def basement_mesh(name,verts,faces,mat,smooth=False):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=finish(bpy.data.objects.new(name,mesh),name,mat)
    for face in mesh.polygons:face.use_smooth=smooth
    return obj

def hanging_storage_sheet(start,end,phase):
    """Closed 3 mm cloth shell: broad sag and irregular folds, not rigid slats."""
    a,b=Vector((*start,0)),Vector((*end,0))
    tangent=(b-a).normalized()
    normal=Vector((-tangent.y,tangent.x,0))
    cols,rows=32,12
    verts=[]
    for side in [-1,1]:
        for j in range(rows+1):
            v=j/rows
            for i in range(cols+1):
                u=i/cols
                top=2.31-.13*math.sin(math.pi*u)**2
                hem=.06+.045*math.sin(2*math.pi*u+phase)**2
                ripple=(.026*math.sin(7*math.pi*u+phase)+.013*math.sin(19*math.pi*u+v))*math.sin(math.pi*u)
                bow=.08*math.sin(math.pi*u)*math.sin(math.pi*v)
                p=a+(b-a)*u+normal*(ripple+bow+side*.0015)
                verts.append((p.x,p.y,hem+(top-hem)*v))
    layer=(cols+1)*(rows+1)
    faces=[]
    for j in range(rows):
        for i in range(cols):
            q=j*(cols+1)+i
            f=(q,q+1,q+cols+2,q+cols+1)
            faces.extend([f,tuple(k+layer for k in reversed(f))])
    border=list(range(cols+1))+[j*(cols+1)+cols for j in range(1,rows+1)]
    border+=list(range(rows*(cols+1)+cols-1,rows*(cols+1)-1,-1))
    border+=[j*(cols+1) for j in range(rows-1,0,-1)]
    for i,q in enumerate(border):
        r=border[(i+1)%len(border)]
        faces.append((q,q+layer,r+layer,r))
    basement_mesh('Sagging off-white storage sheet',verts,faces,bedding,True)
    for u in [0,.5,1]:
        p=a+(b-a)*u
        rod('Sheet ceiling tie',(p.x,p.y,2.31-.13*math.sin(math.pi*u)**2),(p.x,p.y,2.38),.006,white)

# The basement occupies an estimated rectangle under the main level. Its
# Homeowner clarification: descending toward -X, office is RIGHT (+Y), play
# is LEFT (-Y). Keep the middle open, with a direct approach to foosball.
new_collection('30 | Basement foundation and partitions')
asset('Basement slab',(0,0,BASEMENT_Z),photos='W4-W8',confidence='estimated footprint beneath main level')
box('Basement concrete floor',(3.9,4,-.07),(7.8,8,.14),concrete_new)
box('Basement clean resilient floor',(3.90,3.94,.018),(7.62,7.75,.025),pine)
partition('Basement playroom foundation wall',(0,0),(7.8,0),blockmat,height=2.55)
partition('White basement foundation wall',(0,0),(0,8),blockmat,height=2.55)
partition('Basement rear window wall',(0,8),(7.8,8),blockmat,[(2.0,3.20,1.92,2.52)],height=2.55)
partition('Basement east foundation',(7.8,0),(7.8,8),blockmat,[(3.42,4.60,0,2.55)],height=2.55)
for z in [.22+i*.21 for i in range(11)]:
    for xa,xb in ([(.025,2.0),(3.2,7.775)] if 1.92<z<2.52 else [(.025,7.775)]):
        box('Foundation horizontal mortar seam',((xa+xb)/2,7.929,z),(xb-xa,.006,.009),grout,0)
    box('Foundation front mortar seam',(3.9,.071,z),(7.75,.006,.009),grout,0)
for row in range(11):
    for col in range(19):
        x=.22+col*.40+(row%2)*.20
        if x<7.7 and not (2.0<x<3.2 and row>=9):
            box('Foundation vertical mortar seam',(x,7.926,.115+row*.21),(.009,.006,.19),grout,0)
# H217.410/H219.412 resolve the bright band above the dollhouse as individual
# LEDs on solid wall. The earlier W5 window interpretation was incorrect.
asset('Basement office glass-block window',(2.6,8.0,BASEMENT_Z),0,'House Tour 234.020s',
      'four by two glass modules with center hopper observed; position and exterior grade estimated')
for x in [-.65,.65]:box('Deep masonry window reveal',(x,0,2.22),(.10,.40,.70),white)
for z in [1.87,2.57]:box('Deep masonry window sill',(0,0,z),(1.40,.40,.10),white)
for row in range(2):
    for col in range(4):
        if row==1 and col in [1,2]:continue
        x,z=-.45+col*.30,2.07+row*.30
        box('Glass block mortar surround',(x,0,z),(.30,.11,.30),white,.012)
        box('Rippled glass block',(x,-.065,z),(.276,.028,.276),glass,.016)
        # Tiny undulations catch reflections without an external texture.
        for k in range(3):
            curve('Glass block ripple',[(x-.125+j*.025,-.082+.004*math.sin(j*1.7+k),z-.07+k*.07) for j in range(11)],.0025,glass)
for x in [-.30,.30]:box('Hopper vent upright',(x,-.06,2.37),(.035,.055,.30),white)
for z in [2.22,2.52]:box('Hopper vent rail',(0,-.06,z),(.63,.055,.035),white)
box('Hopper vent glass',(0,-.064,2.37),(.56,.012,.25),glass,.006)
box('Hopper vent latch',(0,-.105,2.48),(.07,.025,.024),black)
asset('Basement fabric room divider',(0,0,BASEMENT_Z),photos='House Tour 212.008-215.010s',
      confidence='L-shaped sagging white cloth beside play/storage observed; endpoints and hidden storage depth estimated')
# Tentative placement leaves the foosball rods and the stair exit at Y3.42 clear.
hanging_storage_sheet((3.5,1.0),(6.9,1.0),.3)
hanging_storage_sheet((6.9,1.0),(6.9,3.3),1.7)
asset('Basement support post',(3.60,3.0,BASEMENT_Z),photos='W6,W8')
rod('Steel basement support',(0,0,0),(0,0,2.52),.06,black)

# Return flight runs toward -X, beside the +Z flight to the main living room.
new_collection('31 | Basement access stairs')
asset('Basement return staircase',photos='W9',confidence='connection observed; 12 rises and run estimated')
for i in range(12):
    x,z=9.69-(i+.5)*.245,-1.05-(i+1)*.175
    box('Basement stair tread',(x,4.01,z+.012),(.252,1.08,.032),carpet,.005)
    box('Basement stair riser',(x+.122,4.01,z+.088),(.02,1.08,.175),white,.003)
rod('Basement stair handrail',(9.55,4.49,-.18),(6.89,4.49,-2.10),.025,oak)
for y in [3.43,4.59]:
    box('Basement stair side enclosure',(8.83,y,-1.37),(1.75,.10,3.10),wall)
framed_opening('Basement door beside living steps',(9.72,4.01,-1.05),1.10,2.05,90,'W9')
asset('Sloped enclosure below upstairs flight',photos='W9')
profile=[(7.79,-.25),(9.73,.93),(9.73,1.00),(7.79,-.18)]
mesh=bpy.data.meshes.new('Basement staircase sloped ceiling')
mesh.from_pydata([(x,y,z) for y in [3.43,4.59] for x,z in profile],[],
                 [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
finish(bpy.data.objects.new('Basement staircase sloped ceiling',mesh),'Basement staircase sloped ceiling',white)
# The existing family floor ends at X=9.69, so this flight needs no floor cut.

new_collection('32 | Basement playroom furniture')
asset('Basement foosball table',(4.75,2.30,BASEMENT_Z),0,'W4; homeowner: direct access from stair landing')
box('Foosball cabinet',(0,0,.77),(1.42,.78,.28),walnut)
box('Foosball green playfield',(0,0,.925),(1.25,.63,.016),green)
for y in [-.375,.375]:box('Foosball raised side',(0,y,.98),(1.42,.05,.18),black)
for x in [-.685,.685]:box('Foosball end',(x,0,.98),(.045,.75,.18),black)
for x in [-.56,.56]:
    for y in [-.28,.28]:box('Foosball tapered leg',(x,y,.34),(.105,.105,.68),black)
for i in range(8):
    x=-.52+i*.15
    rod('Foosball steel rod',(x,-.58,.99),(x,.56,.99),.009,steel)
    rod('Foosball handle',(x,-.70 if i%2 else .57,.99),(x,-.58 if i%2 else .69,.99),.023,black)
    for y in [-.22,0,.22]:
        box('Foosball player',(x,y,.94),(.035,.047,.13),red if i%2 else navy,.008)
        sphere('Foosball player head',(x,y,1.03),(.026,.026,.027),red if i%2 else navy)
asset('Basement metal bunk bed',(1.05,2.68,BASEMENT_Z),0,'W4,W5')
for x in [-.73,.73]:
    for y in [-1.04,1.04]:rod('Bunk metal upright',(x,y,.07),(x,y,1.80),.028,black)
for z,w in [(.31,1.47),(1.40,.90)]:
    box('Bunk mattress',(0,0,z+.12),(w,2.03,.23),bedding,.08)
    box('Bunk made cover',(0,-.22,z+.26),(w,1.54,.06),bedding,.04)
    box('Bunk pillow',(0,.70,z+.28),(.65,.4,.12),bedding,.05)
    for y in [-1.04,1.04]:rod('Bunk end crossbar',(-w/2,y,z),(w/2,y,z),.025,black)
for y in [-1.03,1.03]:
    for z in [1.66,1.83]:rod('Upper bunk guard',(-.48,y,z),(.48,y,z),.023,black)
for x in [.32,.73]:rod('Bunk ladder rail',(x,-1.17,.06),(x,-1.06,1.5),.025,black)
for i in range(5):rod('Bunk ladder rung',(.32,-1.16+i*.02,.24+i*.27),(.73,-1.16+i*.02,.24+i*.27),.02,black)
asset('Basement toddler slide',(2.63,1.92,BASEMENT_Z),0,'W4,W5')
for x in [-.25,.25]:
    box('Slide ladder side',(x,.29,.43),(.06,.14,.86),cream)
    rod('Slide handhold',(x,.25,.65),(x,.25,1.0),.033,cream)
for z in [.18,.39,.60]:box('Slide ladder step',(0,.29,z),(.48,.23,.05),cream)
o=box('Blue sloping slide',(0,-.30,.39),(.51,1.22,.055),bluegrey,.026)
o.rotation_euler.x=math.radians(33)
for x in [-.25,.25]:rod('Slide raised side',(x,.23,.78),(x,-.80,.11),.045,bluegrey)
# H209.707/H210.007 preserve the straight stair bearing: the bookcase end is
# near the right of the stair exit, with the dollhouse beyond/right of the bunk.
# H217.410/H219.412 tie these landmarks together after the sweep to the cloth.
# These relationships supersede the incompatible W5-only arrangement; offsets
# and dimensions are still a fitted plan, not recovered camera measurements.
shelf_unit('Basement tall open bookcase',(3.75,4.80,BASEMENT_Z),1.0,1.91,pine,0,
           'House Tour 209.707/217.410/219.412s')
ROOT['confidence'] = 'bookcase beside stair approach at play-office boundary observed; position and size estimated'
ASSETS[-1]['confidence'] = ROOT['confidence']
asset('Basement dollhouse',(.33,4.25,BASEMENT_Z),90,
      'House Tour 210.007/217.410/219.412s',
      'beyond and right of bunk from stair entry observed; wall offset, size and toy details estimated')
for x in [-.48,0,.48]:box('Dollhouse upright',(x,0,.71),(.04,.30,1.4),pinkwood)
for z in [.05,.49,.95,1.38]:box('Dollhouse floor',(0,0,z),(.99,.34,.04),white)
box('Dollhouse back',(0,.16,.72),(.99,.025,1.4),pinkwood)
for x,a in [(-.25,-.48),(.25,.48)]:
    o=box('Dollhouse pitched roof',(x,0,1.50),(.58,.39,.055),white);o.rotation_euler.y=a
asset('Basement cream floor rocker',(2.49,4.20,BASEMENT_Z),90,
      'House Tour 219.012/219.412s',
      'rocker near bookcase and saucer chair observed; position and angle estimated')
box('Floor rocker seat',(0,0,.18),(.61,.62,.23),linen,.10)
o=box('Floor rocker back',(0,.25,.54),(.60,.18,.88),linen,.10);o.rotation_euler.x=-.14
asset('Basement saucer chair',(1.35,4.25,BASEMENT_Z),90,
      'House Tour 217.410/219.412s',
      'pale saucer chair in front of dollhouse observed; position and angle estimated')
sphere('Saucer chair fabric seat',(0,0,.52),(.42,.18,.42),bedding)
for x in [-.30,.30]:
    rod('Saucer chair folding stand',(x,-.27,.02),(x,.22,.64),.016,steel)
    rod('Saucer chair crossed stand',(x,.27,.02),(x,-.22,.64),.016,steel)

ledmat=material('Cool basement LED emitters',(.58,.70,1.0),.4)
ledbs=ledmat.node_tree.nodes['Principled BSDF']
ledbs.inputs['Emission Color'].default_value=(.58,.70,1.0,1)
ledbs.inputs['Emission Strength'].default_value=3.0
asset('Basement playroom LED strip',(.095,4.37,BASEMENT_Z),90,
      'House Tour 217.410/219.412s',
      'individual cool LED emitters on solid wall above dollhouse observed; length, spacing and height estimated')
box('Playroom LED tape backing',(0,0,2.06),(1.85,.010,.012),white,0)
for i in range(47):
    box('Playroom LED emitter',(-.90+i*.039,-.009,2.06),(.006,.006,.006),ledmat,0)

new_collection('33 | Basement office laundry and mechanical')
shelf_unit('Basement metal storage shelving',(.50,5.70,BASEMENT_Z),1.65,1.98,black,90,'W6')
for z in [.20,.67,1.14]:
    for x in [-.52,0,.52]:box('Neatly stored closed bin',(x,0,z),(.46,.32,.27),bluegrey,.02)
chest('Basement white storage cabinet',(1.18,5.02,BASEMENT_Z),1.15,1.55,0,2,2,'W6')
# H227 corrects the earlier oblique view: wood drawer desk, laptop and one
# landscape monitor, with TWO portrait monitors on a separate raised stand.
asset('Basement wood computer desk',(2.96,7.43,BASEMENT_Z),0,'House Tour 227.017s',
      'wood drawer desk observed; 1.48 m width and position estimated')
box('Wood desk top',(0,0,.735),(1.48,.74,.065),oak,.018)
box('Desk drawer pedestal',(-.485,.005,.365),(.47,.64,.70),oak,.01)
for z,h in [(.66,.075),(.55,.12),(.41,.13),(.255,.145),(.105,.135)]:
    box('Wood pedestal drawer',(-.485,-.327,z),(.445,.035,h),oak,.006)
    sphere('Dark round drawer knob',(-.485,-.359,z),(.018,.016,.018),black)
box('Desk center shallow drawer',(.225,-.32,.643),(.91,.08,.125),oak,.009)
sphere('Center drawer knob',(.225,-.373,.643),(.018,.016,.018),black)
for y in [-.28,.28]:box('Wood desk right leg',(.675,y,.35),(.065,.065,.70),oak,.007)
box('Desk rear apron',(.23,.30,.63),(.94,.04,.16),oak,.004)
asset('Basement dual monitors',(2.96,7.43,BASEMENT_Z),0,'House Tour 227.017s',
      'three external displays (one landscape, two portrait) plus laptop observed; legacy identifier retained; dimensions estimated')
box('Landscape monitor base',(.23,.06,.785),(.25,.20,.025),black)
rod('Landscape monitor stand',(.23,.09,.78),(.23,.09,.97),.023,black)
box('Landscape computer monitor',(.23,.075,1.105),(.65,.052,.39),black,.012)
box('Landscape blank display',(.23,.044,1.105),(.616,.009,.356),screen,.003)
for x in [1.015,1.445]:
    box('Portrait monitor base',(x,.09,1.005),(.28,.24,.025),black,.01)
    rod('Portrait monitor stand',(x,.12,1.01),(x,.12,1.24),.022,black)
    box('Portrait computer monitor',(x,.10,1.385),(.405,.055,.70),black,.012)
    box('Portrait blank display',(x,.067,1.385),(.373,.009,.664),screen,.003)
box('Open laptop keyboard',(-.48,-.16,.785),(.40,.28,.018),steel,.008)
box('Laptop inset keyboard',(-.48,-.13,.797),(.33,.15,.006),black,.003)
box('Laptop trackpad',(-.48,-.245,.797),(.105,.055,.006),utilityplastic,.004)
o=box('Open laptop display',(-.48,-.01,.93),(.40,.025,.27),black,.01)
o.rotation_euler.x=math.radians(-12)
box('Laptop dark display',(-.48,-.027,.93),(.37,.008,.23),screen,.004).rotation_euler.x=math.radians(-12)
asset('Basement raised monitor stand',(4.20,7.43,BASEMENT_Z),0,'House Tour 227.017s',
      'separate raised stand and lower keyboard tray observed; size and placement estimated')
box('Raised stand wood top',(0,.025,.976),(.91,.58,.04),oak,.012)
for x in [-.38,.38]:
    for y in [-.20,.24]:rod('Raised stand tubular leg',(x,y,.035),(x,y,.955),.018,steel)
    rod('Raised stand floor runner',(x,-.31,.035),(x,.29,.035),.02,black)
    rod('Keyboard tray side support',(x,-.42,.75),(x,.20,.75),.012,steel)
rod('Raised stand back brace',(-.38,.24,.20),(.38,.24,.90),.012,steel)
box('Separate keyboard tray',(0,-.23,.759),(.88,.40,.032),oak,.012)
box('Stand keyboard',(0,-.24,.786),(.48,.16,.027),black,.009)
box('Keyboard key field',(-.045,-.23,.803),(.33,.12,.007),bikeblack,.003)
sphere('Stand mouse',(.31,-.23,.797),(.028,.046,.018),black)
asset('Basement black office chair',(3.90,6.38,BASEMENT_Z),180,'W6,W8')
rod('Office chair gas lift',(0,0,.10),(0,0,.47),.048,steel)
for i in range(5):
    a=i*math.tau/5
    rod('Office chair star foot',(0,0,.12),(.34*math.cos(a),.34*math.sin(a),.08),.024,black)
    sphere('Office chair caster',(.34*math.cos(a),.34*math.sin(a),.06),(.055,.037,.055),black)
box('Black office chair seat',(0,0,.51),(.59,.57,.13),black,.09)
box('Black office chair back',(0,.25,.86),(.57,.14,.68),black,.09)
for x in [-.34,.34]:
    rod('Office chair arm upright',(x,.1,.49),(x,.1,.73),.021,black)
    box('Office chair arm pad',(x,-.02,.75),(.075,.39,.065),black,.025)
table('Basement second workstation',(.43,7.20,BASEMENT_Z),(1.20,.65,.73),pine,90,'House Tour 228/231s')
box('Second workstation screen',(0,.10,1.01),(.53,.065,.32),black)
asset('Basement second office chair',(1.30,7.20,BASEMENT_Z),-90,'House Tour 228/231s')
box('Second office chair seat',(0,0,.46),(.46,.45,.045),white,.035)
for x in [-.21,.21]:
    rod('White metal chair front leg',(x,-.19,.02),(x,-.19,.45),.013,white)
    rod('White metal chair rear frame',(x,.19,.02),(x,.19,.91),.013,white)
for z in [.64,.76,.88]:rod('White metal chair back rail',(-.21,.19,z),(.21,.19,z),.014,white)
for x,y in [(1.58,7.62),(1.97,7.55)]:
    asset('Basement potted plant',(x,y,BASEMENT_Z),photos='W6; House Tour 227.017s',
          confidence='plants beside office desks observed; positions estimated and clear of wood desktop')
    cylinder('Plant pot',(0,0,.15),.15,.30,black,24,top=.19)
    for i in range(7):
        a=i*math.tau/7
        rod('Plant stem',(0,0,.30),(.19*math.cos(a),.19*math.sin(a),1.18),.012,green)
        sphere('Simplified plant leaf',(.23*math.cos(a),.23*math.sin(a),1.05),(.09,.06,.32),green)
asset('Basement stationary exercise bike',(1.10,5.98,BASEMENT_Z),0,'House Tour 230.018s',
      'black exercise bike with red accent between storage and second desk observed; dimensions and axis estimated')
# Approximate footprint X.82..1.38, Y5.43..6.53 avoids rack/cabinet and desk.
for y in [-.45,.45]:
    rod('Exercise bike stabilizer',(-.25,y,.065),(.25,y,.065),.026,bikeblack)
    for x in [-.25,.25]:box('Exercise bike rubber foot',(x,y,.043),(.07,.12,.05),bikeblack,.012)
rod('Bike low frame',(0,-.44,.13),(0,.44,.13),.036,bikeblack)
for a,b in [((0,-.40,.14),(0,-.15,.43)),((0,-.15,.43),(0,.30,.14)),
            ((0,-.15,.43),(0,.27,.58)),((0,.27,.58),(0,.42,.14))]:
    rod('Exercise bike main frame',a,b,.038,bikeblack)
rod('Bike adjustable seat tube',(0,-.16,.37),(0,-.26,.81),.029,steel)
rod('Bike seat collar',(0,-.19,.46),(0,-.22,.61),.04,bikeblack)
sphere('Exercise bike saddle',(0,-.29,.855),(.135,.165,.045),bikeblack)
rod('Bike handlebar mast',(0,.27,.42),(0,.40,1.01),.030,bikeblack)
curve('Exercise bike handlebars',[(-.22,.30,1.11),(-.22,.46,1.05),(-.15,.48,1.01),(.15,.48,1.01),(.22,.46,1.05),(.22,.30,1.11)],.022,bikeblack)
box('Exercise bike small console',(0,.39,1.025),(.17,.13,.05),bikeblack,.013).rotation_euler.x=.35
box('Exercise bike blank console',(0,.37,1.052),(.13,.09,.007),screen,.004).rotation_euler.x=.35
o=cylinder('Exercise bike red flywheel',(0,.18,.375),.238,.095,red,32);o.rotation_euler.y=math.pi/2
o=cylinder('Exercise bike flywheel face',(0,.18,.375),.198,.103,bikeblack,32);o.rotation_euler.y=math.pi/2
for x in [-.057,.057]:
    o=cylinder('Exercise bike flywheel hub',(x,.18,.375),.07,.012,steel,20);o.rotation_euler.y=math.pi/2
    rod('Bike drive casing',(x,-.16,.35),(x,.18,.375),.073,bikeblack)
rod('Exercise bike crank axle',(-.15,-.16,.35),(.15,-.16,.35),.022,steel)
for x,dy in [(-.14,-.12),(.14,.12)]:
    rod('Exercise bike crank',(x,-.16,.35),(x,-.16+dy,.35),.018,steel)
    box('Exercise bike pedal',(x,-.16+dy,.35),(.13,.085,.027),bikeblack,.008)
    curve('Bike pedal strap',[(x-.045,-.18+dy,.36),(x-.045,-.18+dy,.41),(x+.045,-.18+dy,.41),(x+.045,-.18+dy,.36)],.009,bikeblack)
asset('Basement top loading washer',(6.94,7.43,BASEMENT_Z),0,'W7,W8')
box('Washer body',(0,0,.48),(.70,.69,.96),white,.035)
box('Washer top lid',(0,-.045,.983),(.62,.53,.035),tilewhite,.016)
box('Washer control console',(0,.28,1.04),(.69,.13,.15),white,.02)
for x in [-.23,0,.23]:cylinder('Washer dial',(x,.204,1.05),.025,.02,black).rotation_euler.x=math.pi/2
asset('Basement laundry utility sink',(6.03,7.44,BASEMENT_Z),0,'W7,W8')
for x in [-.28,.28]:
    for y in [-.23,.23]:box('Utility sink leg',(x,y,.36),(.04,.04,.72),steel)
basin('Deep utility sink',(0,0),.72,.58,.88,.57,concrete_new)
curve('Utility sink faucet',[(0,.25,.89),(0,.25,1.04),(0,.04,1.04),(0,.01,.98)],.015,steel)
asset('Basement front loading dryer',(5.09,7.43,BASEMENT_Z),0,'W7,W8')
box('Dryer body',(0,0,.48),(.73,.70,.96),white,.035)
box('Dryer control panel',(0,.23,1.02),(.72,.18,.14),white,.02)
box('Dryer control display',(.20,.131,1.035),(.18,.016,.055),screen)
box('Dryer door trim',(0,-.362,.47),(.57,.038,.64),steel,.065)
box('Dryer dark glazed door',(0,-.385,.47),(.49,.025,.55),screen,.095)
rod('Dryer pull',(-.21,-.415,.72),(.21,-.415,.72),.018,white)
asset('Basement dehumidifier',(6.07,6.70,BASEMENT_Z),0,'W7,W8')
box('Dehumidifier casing',(0,0,.32),(.38,.29,.64),white,.045)
for i in range(9):box('Dehumidifier grille',(0,-.151,.42+i*.015),(.27,.008,.005),steel,0)
box('Water level slot',(0,-.157,.18),(.022,.009,.17),screen)
asset('Basement furnace and plenum',(7.34,5.66,BASEMENT_Z),-90,'W7')
box('Furnace cabinet',(0,0,.65),(.72,.75,1.30),steel,.018)
for z in [.34,.96]:box('Furnace access panel',(0,-.39,z),(.65,.035,.55),steel,.009)
box('Furnace access handle',(.20,-.42,.59),(.11,.02,.026),black)
box('Supply plenum',(0,.02,1.69),(.65,.66,.78),steel)
for x in [-.24,.24]:
    curve('Furnace white vent',[(x,-.12,1.18),(x,-.12,2.12),(x,.10,2.35)],.047,white)
asset('Basement wall mounted water heater',(7.70,6.79,BASEMENT_Z),-90,'W7')
box('Wall water heater body',(0,0,1.39),(.43,.25,.70),white,.025)
box('Water heater control',(0,-.135,1.22),(.09,.015,.14),black)
for x in [-.13,.13]:rod('Heater connection pipe',(x,0,.67),(x,0,1.04),.017,brass)
curve('Water heater vent',[(0,0,1.74),(0,0,2.28),(.45,0,2.28)],.043,white)

def hooded_litter_box(name,y,flap):
    asset(name,(7.43,y,BASEMENT_Z),-90,'House Tour 223.015/225.015s',
          'gray hooded litter box with aisle-facing entrance observed; size and position estimated')
    box('Molded litter tray',(0,0,.092),(.46,.55,.15),utilityplastic,.055)
    box('Litter tray rim',(0,0,.164),(.474,.564,.025),utilityplastic,.035)
    # A real opening and hollow hood: avoid a dark rectangle pasted on a solid box.
    profile=[(-.222,.155),(.222,.155),(.228,.29),(.211,.39),(.161,.465),
             (.08,.49),(-.08,.49),(-.161,.465),(-.211,.39),(-.228,.29)]
    aperture=[(x*.69,.175+(z-.155)*.77) for x,z in profile]
    inner=[(x*.95,.163+(z-.155)*.96) for x,z in profile]
    rings=[[(x,-.274,z) for x,z in profile],[(x,.274,z) for x,z in profile],
           [(x,-.278,z) for x,z in aperture],[(x,-.253,z) for x,z in inner],
           [(x,.255,z) for x,z in inner]]
    verts=[p for ring in rings for p in ring]
    n=len(profile)
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,i+n,j+n,j),(i,j,j+2*n,i+2*n),
                      (i+2*n,j+2*n,j+3*n,i+3*n),(i+3*n,j+3*n,j+4*n,i+4*n)])
    faces.extend([tuple(reversed(range(n,2*n))),tuple(range(4*n,5*n))])
    hood=basement_mesh('Hollow rounded litter box hood',verts,faces,utilityplastic)
    for i,face in enumerate(hood.data.polygons):face.use_smooth=i<4*n and i%4 in [0,3]
    box('Clean litter inside tray',(0,0,.181),(.38,.45,.014),grout,.012)
    curve('Hood carrying handle',[(-.055,-.015,.485),(-.055,-.015,.515),(.055,-.015,.515),(.055,-.015,.485)],.01,utilityplastic)
    if flap:
        pane=[(x*.92,-.285,.183+(z-.175)*.95) for x,z in aperture]
        basement_mesh('Translucent litter door flap',pane,[tuple(range(n))],glass)
        rod('Litter flap top hinge',(-.06,-.287,.431),(.06,-.287,.431),.009,utilityplastic)

# Compact pair fits between the existing furnace and washer, under the heater.
# These centers differ slightly from intake guesses to avoid appliance overlap.
hooded_litter_box('Basement open hooded litter box',6.31,False)
hooded_litter_box('Basement flap hooded litter box',6.84,True)
asset('Basement litter pail',(6.98,6.93,BASEMENT_Z),0,'House Tour 223.015s',
      'small gray pail beside washer and litter boxes observed; size and location estimated')
box('Gray litter pail body',(0,0,.22),(.22,.21,.41),utilityplastic,.035)
box('Gray litter pail lid',(0,0,.435),(.235,.225,.035),utilityplastic,.025)
box('Pail recessed top',(0,-.005,.456),(.12,.115,.009),bluegrey,.02)
box('Pail front handle',(0,-.111,.31),(.13,.018,.027),black,.008)

basement_ceiling=new_collection('34 | Basement exposed ceiling - hide for plan')
asset('Exposed basement floor joists',(0,0,BASEMENT_Z),photos='W4-W8')
for y in [.12+i*.41 for i in range(20)]:box('Basement timber floor joist',(3.9,y,2.38),(7.8,.06,.22),joistmat,.003)
box('Basement support beam',(3.6,4,2.22),(.14,8,.27),joistmat)
box('Basement ceiling underside',(3.9,4,2.54),(7.8,8,.05),pine,0)
asset('Basement overhead service runs',(0,0,BASEMENT_Z),photos='W6-W8',confidence='visible representative pipes and ducts, not engineering routing')
box('Galvanized main air duct',(5.32,4.10,2.23),(.51,7.40,.28),steel)
for x in [5.78,6.03,6.22]:rod('White overhead service pipe',(x,.12,2.18),(x,7.80,2.18),.032,white)
rod('Furnace duct branch',(5.3,5.66,2.23),(7.30,5.66,2.23),.15,steel)

# Garage local rectangle is X=-6.9..-.1, Y=1.1..8.1. Access attachment can
# be adjusted independently; W3 fixes adjacency, not a measured footprint.
new_collection('35 | Garage shell and doors')
asset('Two bay garage shell',photos='W1-W3',confidence='two vehicles observed; footprint and door offsets estimated')
box('Garage concrete slab',(-3.5,3.15,-.49),(6.8,9.9,.66),concrete_new)
partition('Garage west wall',(-6.9,-1.8),(-6.9,8.1),blockmat,height=2.68)
# House Tour 30/33s and Backyard tour 18s agree on these rear openings.
# The sectional is one-car wide; the glazed pedestrian door is beside it.
partition('Garage rear wall',(-6.9,8.1),(-.1,8.1),blockmat,
          [(0.50,3.30,0,2.10),(3.65,4.60,0,2.07),(5.10,6.10,.80,1.80)],height=2.68)
partition('Garage front opening',(-6.9,-1.8),(-.1,-1.8),joistmat,[(.42,6.4,0,2.25)],height=2.68)
partition('Garage house side',(-.10,-1.8),(-.10,8.1),blockmat,[(8.96,9.76,0,2.10)],height=2.68)
# Wall primitives start at Z0; fill the 16 cm gap to the slab, preserving doors.
box('Garage west foundation skirt',(-6.9,3.15,-.08),(.14,9.9,.16),blockmat,.004)
for xa,xb in [(-6.9,-6.4),(-3.6,-3.25),(-2.3,-.1)]:
    box('Garage rear foundation skirt',((xa+xb)/2,8.1,-.08),(xb-xa,.14,.16),blockmat,.004)
for xa,xb in [(-6.9,-6.48),(-.5,-.1)]:
    box('Garage front foundation skirt',((xa+xb)/2,-1.8,-.08),(xb-xa,.14,.16),blockmat,.004)
for ya,yb in [(-1.8,7.16),(7.96,8.1)]:
    box('Garage east foundation skirt',(-.1,(ya+yb)/2,-.08),(.14,yb-ya,.16),blockmat,.004)
framed_opening('Garage overhead vehicle opening',(-3.49,-1.80,-.16),5.98,2.42,0,'W1; House Tour 24s')
framed_opening('Garage rear sectional opening',(-5.00,8.1,-.16),2.80,2.26,180,'House Tour 30/33s; Backyard tour 18s')
for i in range(5):
    z=.226+i*.452
    box('Rear sectional white panel',(0,0,z),(2.70,.045,.438),white,.01)
    # A vertical stack of small dark glazed insets near one edge.
    box('Rear sectional inset frame',(-.92,.028,z),(.35,.016,.27),black,.02)
    box('Rear sectional inset glass',(-.92,.04,z),(.30,.008,.22),glass,.01)
window('Garage rear window',(-1.30,8.11,1.30),1.00,1.00,180,False,False)
framed_opening('Garage glazed side door',(-2.775,8.1,-.16),.95,2.23,180,'W2,W3; House Tour 33s',)
box('Side door lower panel',(0,0,.41),(.85,.045,.76),white)
for x in [-.41,.41]:box('Side door glazed frame',(x,0,1.43),(.06,.045,1.29),white)
for z in [.82,2.05]:box('Side door glazed crossrail',(0,0,z),(.88,.045,.055),white)
box('Side door glass',(0,0,1.44),(.75,.014,1.17),glass,0)
framed_opening('Kitchen garage connecting doorway',(-.1,7.56,0),.80,2.10,90,'W3; homeowner confirmation')
box('Kitchen garage threshold',(0,0,-.025),(.80,.30,.05),oak)
asset('Garage wall tool board',(-6.79,3.10,.15),90,'W1,W2')
box('Timber tool board',(0,0,1.05),(1.8,.05,1.22),joistmat)
for x in [-.6,-.2,.2,.6]:
    rod('Empty tool hook',(x,-.03,1.4),(x,-.15,1.4),.012,black)
asset('Kitchen garage coat hooks',(.05,7.90,0),180,'W3')
for z in [.65,1.20,1.75]:
    box('Timber coat hook rail',(0,0,z),(.88,.04,.08),oak)
    for x in [-.31,0,.31]:curve('Empty coat hook',[(x,-.025,z),(x,-.07,z-.04),(x,-.10,z-.02)],.009,black)

new_collection('36 | Garage vehicles and storage')
def vehicle(name,pos,width,length,paint):
    asset(name,pos,0,'W1,W2','simplified parked SUV; no badges or license details')
    box('Vehicle lower body',(0,0,.64),(width,length,.68),paint,.19)
    box('Vehicle passenger cabin',(0,-.17,1.19),(width*.88,length*.55,.69),paint,.18)
    box('Vehicle dark windshield',(0,length*.235,1.34),(width*.77,.035,.44),screen,.055)
    box('Vehicle rear glass',(0,-length*.30,1.34),(width*.74,.035,.40),screen,.045)
    for x in [-width*.449,width*.449]:
        for y in [-.63,.38]:box('Vehicle side glass',(x,y,1.33),(.025,.84,.40),screen,.045)
        box('Vehicle side mirror',(x*1.09,.88,1.14),(.16,.22,.11),paint,.04)
    for x in [-width*.48,width*.48]:
        for y in [-length*.30,length*.29]:
            o=cylinder('Vehicle rubber tire',(x,y,.42),.34,.21,black,32);o.rotation_euler.y=math.pi/2
            o=cylinder('Vehicle wheel hub',(x*1.026,y,.42),.22,.22,steel,24);o.rotation_euler.y=math.pi/2
    box('Vehicle grille',(0,length/2+.015,.68),(width*.68,.04,.26),black,.03)
    for x in [-width*.34,width*.34]:box('Vehicle headlamp',(x,length/2+.025,.93),(width*.23,.04,.12),tilewhite,.025)
    box('Vehicle lower bumper',(0,length/2+.028,.41),(width*.84,.04,.12),steel,.03)
vehicle('Garage black SUV',(-2.10,4.27,-.16),1.83,4.43,carblack)
vehicle('Garage burgundy SUV',(-4.62,4.05,-.16),1.78,4.34,burgundy)
shelf_unit('Garage tall white storage',(-.40,3.05,-.16),1.80,2.08,white,-90,'W1')
shelf_unit('Garage rear storage rack',(-6.57,5.33,-.16),1.88,1.94,oak,90,'W1; moved clear of video-confirmed rear door')
asset('Garage wall hung bicycle',(-6.78,6.85,.06),90,'W2,W3')
for z in [.73,1.69]:
    curve('Bicycle tire',[(.30*math.cos(t),-.20,z+.30*math.sin(t)) for t in [i*math.tau/40 for i in range(41)]],.025,black,True)
    for i in range(12):
        a=i*math.tau/12
        rod('Bicycle spoke',(0,-.20,z),(.28*math.cos(a),-.20,z+.28*math.sin(a)),.003,steel)
for a,b in [((0,.73),(.26,1.2)),((.26,1.2),(0,1.69)),((0,1.69),(-.17,1.14)),((-.17,1.14),(0,.73)),((-.17,1.14),(.26,1.2))]:
    rod('Bicycle blue frame',(a[0],-.20,a[1]),(b[0],-.20,b[1]),.018,bluegrey)

garage_ceiling=new_collection('37 | Garage exposed roof and door tracks')
asset('Garage exposed rafters',photos='W1,W2')
for y in [-1.7+i*.43 for i in range(23)]:box('Garage exposed joist',(-3.5,y,2.59),(6.8,.055,.20),joistmat,.003)
box('Garage roof underside',(-3.5,3.15,2.65),(6.9,10.0,.06),pine)
asset('Raised sectional garage door and tracks',photos='W1,W2')
for x in [-6.40,-.57]:
    curve('Garage overhead track',[(x,-1.77,.15),(x,-1.77,2.07),(x,-1.68,2.28),(x,-1.47,2.41),(x,.78,2.41)],.022,steel)
for i in range(5):box('Raised white garage door panel',(-3.49,-1.52+i*.43,2.39),(5.79,.424,.055),white)
rod('Garage torsion shaft',(-6.5,-1.60,2.42),(-.48,-1.60,2.42),.025,steel)
asset('Garage rear sectional tracks',photos='House Tour 30/33s')
for x in [-6.35,-3.65]:
    curve('Rear garage overhead track',[(x,8.03,.05),(x,8.03,1.95),(x,7.94,2.16),(x,7.73,2.29),(x,5.65,2.29)],.019,steel)

# Useful room lights remain separately switchable with their architecture.
new_collection('38 | Basement and garage lighting')
for name,pos,power,size in [
    ('Basement play ceiling',(1.65,3.9,-.98),155,2.2),
    ('Basement office ceiling',(5.5,2.8,-1.0),120,1.5),
    ('Basement laundry ceiling',(6.0,6.4,-1.0),130,1.4),
    ('Garage ceiling',(-3.5,5.6,2.4),240,3),
    ('Garage door daylight',(-3.5,.2,1.5),360,4)]:
    area(name,pos,(pos[0],pos[1]+1,pos[2]-2),power,size)

# W10 is the third room off the same downstairs entry as V9 and the bathroom.
# Author in room-local coordinates, then rotate the room onto that entry.
new_collection('39 | Pink curtain bedroom')
asset('Pink curtain bedroom shell',(0,0,-1.05),photos='W10; homeowner confirmation',confidence='shared downstairs entry confirmed; room size and doorway offset estimated')
box('Pink bedroom floor',(18.75,9.50,-.04),(3.5,4,.09),walnut)
partition('Pink bedroom left window wall',(17,7.5),(17,11.5),white,[(2.55,3.60,.72,2.05)],height=2.21)
partition('Pink bedroom far window wall',(17,11.5),(20.5,11.5),white,[(.92,2.00,.72,2.05)],height=2.21)
partition('Pink bedroom right wall',(20.5,7.5),(20.5,11.5),white,height=2.21)
partition('Pink bedroom entry wall',(17,7.5),(20.5,7.5),white,[(.23,1.09,0,2.05)],height=2.21)
upper_window('Pink bedroom side window',(17.01,10.575,1.38),1.05,90,'W10')
upper_window('Pink bedroom far window',(18.46,11.49,1.38),1.08,0,'W10')
for obj in COLL.objects:
    if obj.parent is None and obj.name != 'Pink curtain bedroom shell':obj.location.z-=1.05
for obj in COLL.objects:
    if obj.type=='MESH' and obj.name.startswith('Hanging curtain panel'):
        obj.data.materials.clear();obj.data.materials.append(pinkcloth)
bed('Pink bedroom double bed',(18.38,9.90,-1.025),1.40,90,'W10')
asset('Pink bedroom dress rail',(17.18,10.79,-1.05),90,'W10')
for x in [-.47,.47]:
    rod('Clothing rail upright',(x,0,.04),(x,0,1.29),.018,steel)
    rod('Clothing rail foot',(x,-.20,.04),(x,.20,.04),.018,steel)
rod('Empty clothing rail',(-.47,0,1.29),(.47,0,1.29),.018,steel)
shelf_unit('Pink bedroom low pink shelf',(19.63,11.20,-1.05),1.05,.78,pinkwood,0,'W10')
shelf_unit('Pink bedroom small bookcase',(18.69,11.24,-1.05),.61,.85,white,0,'W10')
chest('Pink bedroom wood dresser',(20.10,8.54,-1.05),.83,1.12,-90,4,1,'W10')
asset('Pink bedroom wall shelves',(17.10,9.07,-1.05),90,'W10')
for z in [1.1,1.45,1.80]:box('Empty wall shelf',(0,0,z),(.63,.20,.025),oak)
asset('Pink bedroom empty toy hammock',(17.43,11.10,-1.05),0,'W10')
curve('Hammock front rim',[(-.30,0,1.76),(0,-.20,1.54),(.30,0,1.76)],.015,bedding)
for i in range(7):
    x=-.28+i*.093
    curve('Hammock net cord',[(x,0,1.75),(x*.55,-.20,1.53),(0,.12,1.77)],.004,bedding)
asset('Pink bedroom small road rug',(19.44,8.15,-1.045),photos='W10')
box('Clean green road rug',(0,0,.018),(.73,1.10,.022),green,.025)
curve('Simple rug road loop',[(.25*math.cos(t),.40*math.sin(t),.034) for t in [i*math.tau/40 for i in range(41)]],.047,tilegrey,True)
area('Pink bedroom ceiling light',(18.75,9.5,1.02),(18.75,9.5,-1),120,1.7)
pink_ceiling=new_collection('40 | Pink bedroom ceiling')
asset('Pink bedroom ceiling',(0,0,-1.05),photos='W10',confidence='ceiling shown clean; damaged panels omitted')
box('Pink bedroom ceiling plane',(18.75,9.5,2.25),(3.5,4,.06),white)
curve('Pink bedroom exposed service pipe',[(17.22,9.05,0),(17.22,9.05,2.10),(18.35,9.05,2.10)],.055,white)

bpy.context.view_layer.update()
pink_attachment = (Matrix.Translation((10.85,6.20,0)) @
                   Matrix.Rotation(math.pi/2,4,'Z') @ Matrix.Diagonal((1,.75,1,1)) @
                   Matrix.Translation((-17.66,-7.50,0)))
for c in NEW_COLLECTIONS:
    if c.name[:2] in {'39','40'}:
        for obj in c.objects:
            if obj.parent is None:
                original=obj.matrix_world.copy()
                if obj.name in {'Pink curtain bedroom shell','Pink bedroom ceiling'}:
                    obj.matrix_world=pink_attachment @ original
                else:
                    # Fit the estimated room depth without squashing the furniture.
                    origin=pink_attachment @ original.translation
                    original.translation=(0,0,0)
                    obj.matrix_world=Matrix.Translation(origin) @ Matrix.Rotation(math.pi/2,4,'Z') @ original

# W3 resolves the opening at the end of the sink/glass-cupboard wall.
# Its clear width and the cabinet widths are estimated within the current shell.
bpy.data.objects.remove(bpy.data.objects['Kitchen sink wall'],do_unlink=True)
COLL=bpy.data.collections['02 | Main architectural walls']
asset('Kitchen sink wall with garage access',photos='6,W3; homeowner confirmation',confidence='door beyond glass cupboard observed; cabinet widths and opening dimensions estimated')
partition('Kitchen wall beside garage opening',(-.07,4.44),(-.07,8.06),wall,[(2.72,3.52,0,2.10)],height=2.6)
scene['garage_attachment']='Attached to kitchen at the end of the sink/glass-cupboard wall, as shown in W3 and confirmed by homeowner. Door and cabinet widths estimated.'
scene['pink_bedroom_attachment']='V8 shows the pink bedroom LEFT of the bathroom; W10 confirms its furnishings. White-curtain bedroom is on the right. Shared entry confirmed by homeowner; dimensions estimated.'
