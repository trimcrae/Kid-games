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

# The basement occupies an estimated rectangle under the main level. Its
# contents are organized around the reverse view W8: office and laundry share
# one open zone. Lightweight fabric screens divide the play space.
new_collection('30 | Basement foundation and partitions')
asset('Basement slab',(0,0,BASEMENT_Z),photos='W4-W8',confidence='estimated footprint beneath main level')
box('Basement concrete floor',(3.9,4,-.07),(7.8,8,.14),concrete_new)
box('Basement clean resilient floor',(3.90,3.94,.018),(7.62,7.75,.025),pine)
partition('Basement playroom window wall',(0,0),(7.8,0),blockmat,
          [( .38,1.88,2.01,2.35)],height=2.55)
for a,b in [((0,0),(0,8)),((0,8),(7.8,8))]:
    partition('White basement foundation wall',a,b,blockmat,height=2.55)
partition('Basement east foundation',(7.8,0),(7.8,8),blockmat,[(3.42,4.60,0,2.55)],height=2.55)
for z in [.22+i*.21 for i in range(11)]:
    box('Foundation horizontal mortar seam',(3.9,7.929,z),(7.75,.006,.009),grout,0)
    if not 2.01 < z < 2.35:
        box('Foundation front mortar seam',(3.9,.071,z),(7.75,.006,.009),grout,0)
    else:
        for xa,xb in [(.025,.38),(1.88,7.775)]:
            box('Foundation front mortar seam',((xa+xb)/2,.071,z),(xb-xa,.006,.009),grout,0)
for row in range(11):
    for col in range(19):
        x=.22+col*.40+(row%2)*.20
        if x<7.7:box('Foundation vertical mortar seam',(x,7.926,.115+row*.21),(.009,.006,.19),grout,0)
# W5 clearly shows a high horizontal window above the dollhouse. Its
# relationship to that furniture is observed; this zone's global rotation
# and reverse-view furniture layout remain provisional (see ORIENTATION.md).
window('Basement playroom high window',(1.13,.01,BASEMENT_Z+2.18),1.50,.34,180,False,False)
ROOT['reference_photos'] = 'W5'
ROOT['confidence'] = 'high window above dollhouse observed; size and global placement estimated'
ASSETS[-1]['photos'] = 'W5'
asset('Basement fabric room divider',(0,0,BASEMENT_Z),photos='W4,W5,W8')
for xa,xb,ya,yb in [(.15,1.55,7.05,7.05),(3.45,3.45,.15,5.95)]:
    rod('Screen suspension line',(xa,ya,2.32),(xb,yb,2.32),.01,black)
    for i in range(48):
        t=(i+.5)/48
        x,y=xa+(xb-xa)*t,ya+(yb-ya)*t
        size=(abs(xb-xa)/48+.008,.025,2.22) if xa!=xb else (.025,abs(yb-ya)/48+.008,2.22)
        box('Hanging clean white screen',(x+.018*math.sin(i),y+.025*math.cos(i),1.18),size,bedding,.006)
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
asset('Basement foosball table',(2.50,5.60,BASEMENT_Z),0,'W4')
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
asset('Basement toddler slide',(2.63,3.86,BASEMENT_Z),0,'W4,W5')
for x in [-.25,.25]:
    box('Slide ladder side',(x,.29,.43),(.06,.14,.86),cream)
    rod('Slide handhold',(x,.25,.65),(x,.25,1.0),.033,cream)
for z in [.18,.39,.60]:box('Slide ladder step',(0,.29,z),(.48,.23,.05),cream)
o=box('Blue sloping slide',(0,-.30,.39),(.51,1.22,.055),bluegrey,.026)
o.rotation_euler.x=math.radians(33)
for x in [-.25,.25]:rod('Slide raised side',(x,.23,.78),(x,-.80,.11),.045,bluegrey)
shelf_unit('Basement tall open bookcase',(3.22,1.29,BASEMENT_Z),1.0,1.91,pine,-90,'W5')
asset('Basement dollhouse',(1.06,.33,BASEMENT_Z),180,'W5')
for x in [-.48,0,.48]:box('Dollhouse upright',(x,0,.71),(.04,.30,1.4),pinkwood)
for z in [.05,.49,.95,1.38]:box('Dollhouse floor',(0,0,z),(.99,.34,.04),white)
box('Dollhouse back',(0,.16,.72),(.99,.025,1.4),pinkwood)
for x,a in [(-.25,-.48),(.25,.48)]:
    o=box('Dollhouse pitched roof',(x,0,1.50),(.58,.39,.055),white);o.rotation_euler.y=a
asset('Basement cream floor rocker',(2.49,1.30,BASEMENT_Z),-30,'W5')
box('Floor rocker seat',(0,0,.18),(.61,.62,.23),linen,.10)
o=box('Floor rocker back',(0,.25,.54),(.60,.18,.88),linen,.10);o.rotation_euler.x=-.14
asset('Basement saucer chair',(2.30,.39,BASEMENT_Z),180,'W5')
sphere('Saucer chair fabric seat',(0,0,.52),(.42,.18,.42),bedding)
for x in [-.30,.30]:
    rod('Saucer chair folding stand',(x,-.27,.02),(x,.22,.64),.016,steel)
    rod('Saucer chair crossed stand',(x,.27,.02),(x,-.22,.64),.016,steel)

new_collection('33 | Basement office laundry and mechanical')
shelf_unit('Basement metal storage shelving',(4.50,5.00,BASEMENT_Z),1.65,1.98,black,180,'W6')
for z in [.20,.67,1.14]:
    for x in [-.52,0,.52]:box('Neatly stored closed bin',(x,0,z),(.46,.32,.27),bluegrey,.02)
chest('Basement white storage cabinet',(5.95,5.00,BASEMENT_Z),1.15,1.55,180,2,2,'W6')
# W8 shows the monitors continuing along the same wall, left of the dryer.
table('Basement wood computer desk',(3.80,7.43,BASEMENT_Z),(1.75,.67,.75),walnut,0,'W6,W8')
asset('Basement dual monitors',(3.80,7.43,BASEMENT_Z),0,'W6,W8')
for x in [-.40,.40]:
    box('Computer monitor base',(x,0,.79),(.26,.19,.025),black)
    rod('Computer monitor stand',(x,.04,.78),(x,.04,1.0),.025,black)
    box('Computer monitor',(x,.04,1.16),(.69,.055,.43),black,.013)
    box('Computer blank display',(x,.006,1.16),(.65,.009,.39),screen,.004)
box('Computer keyboard',(0,-.23,.79),(.45,.15,.018),black)
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
table('Basement second workstation',(2.25,7.43,BASEMENT_Z),(.95,.53,.73),pine,0,'W6')
box('Second workstation screen',(0,.10,1.01),(.53,.065,.32),black)
for x,y in [(1.50,7.44),(2.93,7.70)]:
    asset('Basement potted plant',(x,y,BASEMENT_Z),photos='W6')
    cylinder('Plant pot',(0,0,.15),.15,.30,black,24,top=.19)
    for i in range(7):
        a=i*math.tau/7
        rod('Plant stem',(0,0,.30),(.19*math.cos(a),.19*math.sin(a),1.18),.012,green)
        sphere('Simplified plant leaf',(.23*math.cos(a),.23*math.sin(a),1.05),(.09,.06,.32),green)
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
box('Garage concrete slab',(-3.5,4.6,-.24),(6.8,7,.16),concrete_new)
partition('Garage west wall',(-6.9,1.1),(-6.9,8.1),blockmat,[(4.7,5.65,0,2.07)],height=2.68)
partition('Garage rear wall',(-6.9,8.1),(-.1,8.1),blockmat,height=2.68)
partition('Garage front opening',(-6.9,1.1),(-.1,1.1),joistmat,[(.42,6.4,0,2.25)],height=2.68)
partition('Garage house side',(-.10,1.1),(-.10,8.1),blockmat,[(6.06,6.86,0,2.10)],height=2.68)
framed_opening('Garage overhead vehicle opening',(-3.49,1.10,-.16),5.98,2.42,0,'W1')
framed_opening('Garage glazed side door',(-6.9,6.275,-.16),.95,2.23,90,'W2,W3')
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
shelf_unit('Garage rear storage rack',(-3.45,7.82,-.16),1.88,1.94,oak,0,'W1')
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
for y in [1.2+i*.43 for i in range(17)]:box('Garage exposed joist',(-3.5,y,2.59),(6.8,.055,.20),joistmat,.003)
box('Garage roof underside',(-3.5,4.6,2.72),(6.9,7.1,.06),pine)
asset('Raised sectional garage door and tracks',photos='W1,W2')
for x in [-6.40,-.57]:
    curve('Garage overhead track',[(x,1.13,.15),(x,1.13,2.07),(x,1.22,2.28),(x,1.43,2.41),(x,3.68,2.41)],.022,steel)
for i in range(5):box('Raised white garage door panel',(-3.49,1.38+i*.43,2.39),(5.79,.424,.055),white)
rod('Garage torsion shaft',(-6.5,1.30,2.42),(-.48,1.30,2.42),.025,steel)

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
