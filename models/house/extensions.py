"""Third upload V1-V10: front porch and newly visible lower-level spaces.

Use the actual furniture and empty storage. The homeowner identifies the third
shared-entry room as the pink-curtain bedroom. Footprints remain estimates.
"""
EXTENSION_COLLECTIONS=[]


def extension_collection(name):
    c=collection(name)
    EXTENSION_COLLECTIONS.append(c)
    return c


def copy_furniture(source,name,pos,angle,photos):
    src=bpy.data.objects[source]
    root=asset(name,pos,angle,photos)
    for child in src.children:
        if child.type != 'MESH' and child.type != 'CURVE':
            continue
        o=child.copy()
        o.data=child.data.copy()
        COLL.objects.link(o)
        o.parent=root
    return root


extension_collection('25 | Front porch and path')
concrete=material('Front porch clean concrete',(.40,.42,.39),.92,texture='stone')
brick=material('Path warm grey pavers',(.28,.25,.21),.88,texture='stone')
grass=material('Simple front lawn',(.15,.24,.065),.98)
asset('Covered front porch slab',photos='V4,V5; House Tour 24/39s',confidence='porch topology observed; footprint estimated')
box('Porch concrete slab',(2.55,-.90,-.44),(5.10,1.80,.76),concrete)
for i in range(4):
    box('Front concrete step',(4.25,-1.94-i*.30,-.20-i*.16),(1.04,.32,.20),concrete)
asset('Entry return concrete foundation',photos='House Tour 0/24/39s',
      confidence='enclosed entry requires support to grade; buried foundation construction not observed')
box('Entry return foundation',(6.45,-.90,-.49),(2.70,1.80,.66),concrete)
asset('Front porch black iron railing',photos='V4,V5')
for a,b in [((.08,-1.77),(3.71,-1.77)),((4.79,-1.77),(5.08,-1.77))]:
    length=math.dist(a,b)
    for z in [.06,.85]:rod('Porch horizontal iron rail',(*a,z),(*b,z),.018,black)
    for i in range(max(2,int(length/.13))):
        t=i/max(1,int(length/.13)-1)
        x,y=a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t
        rod('Porch iron spindle',(x,y,-.07),(x,y,.86),.008,black)
for x in [3.72,4.78]:rod('Front step handrail',(x,-1.77,.87),(x,-2.86,.34),.023,black)
asset('Front porch side siding',photos='V4')
box('Porch siding wall backing',(-.04,-.90,1.275),(.06,1.80,2.70),white)
for i in range(19):
    box('Porch horizontal lap siding',(-.015,-.90,.03+i*.13),(.08,1.80,.129),white,.003)
for x in [.06,5.04]:box('White front porch column',(x,-1.77,1.27),(.085,.085,2.66),white)
asset('Clean front porch foam mats',photos='V4')
for ix in range(7):
    for iy in range(2):
        box('Porch colored foam square',(.70+ix*.59,-.43-iy*.59,-.045),(.58,.58,.024),[navy,bluegrey,green,red][(ix+iy)%4],.003)
copy_furniture('Wood nursery rocking chair','Front porch wood rocking chair',(.53,-1.30,-.05),90,'V4; House Tour 42s')
copy_furniture('Wood nursery rocking chair','Front porch white rocking chair',(.53,-.42,-.05),90,'V4; House Tour 42s')
for o in ROOT.children:
    o.data.materials.clear()
    o.data.materials.append(white)
asset('Front mailbox',(4.91,-2.68,-.38),0,'V5; House Tour 21s')
box('Mailbox square post',(0,0,.20),(.09,.09,1.30),black)
box('Black mailbox lower body',(0,0,.99),(.43,.69,.34),black,.08)
o=cylinder('Rounded mailbox roof',(0,0,1.14),.215,.69,black)
o.rotation_euler.x=math.pi/2
box('Mailbox front door',(0,-.35,1.02),(.39,.02,.31),black,.065)
box('Mailbox small front handle',(0,-.375,1.10),(.065,.028,.026),steel)
asset('Curved front paver walk',photos='V5',confidence='curve and stone border observed; length estimated')
for i in range(27):
    t=i/26
    x,y=4.25-4.5*t,-3.06-.68*math.sin(math.pi*t)
    z=-.79+.363*t**4  # meet driveway apron continuously at the garage shoulder
    for j in range(5):
        o=box('Walk rectangular paver',(x,y+(j-2)*.19,z),(.166,.184,.055),brick,.008)
    for side in [-1,1]:box('Pale walk edging block',(x,y+side*.57,z+.04),(.17,.20,.13),concrete,.015)

# Open the newly photographed hall in the original lower room's rear wall.
obj=bpy.data.objects.get('Family west wall')
if obj:
    bpy.data.objects.remove(obj,do_unlink=True)
extension_collection('26 | Lower hall and additional room architecture')
asset('Lower rear wall and hall opening',photos='V6,V8')
partition('Lower rear panel wall',(9.69,4.67),(14.69,4.67),oak,[(1.16,2.31,0,2.08)],height=2.21)
# This architecture collection is authored with floor Z=0; translate it down later.
asset('Lower bedroom hall floor',photos='V6,V8')
# Run the carpet through the doorway in the 12 cm rear wall (the family room
# floor stops at Y=4.60) and just under the bathroom floor's edge (Y=6.64);
# stopping at 4.67 and 6.61 left open slits down to the sky colour.
box('Hall carpet',(11.50,5.62,.015),(1.30,2.05,.04),carpet)
asset('Lower side hall walls',photos='V8')
partition('Hall west wood trim wall',(10.85,4.67),(10.85,6.64),white,[(1.1,1.96,0,2.05)],height=2.21)
upper_door('Pink bedroom shared entry doorway',(10.85,6.20,0),90,'V8,W10')
asset('Lower hall east partition',photos='V8')
partition('Hall east wood trim wall',(12.15,4.67),(12.15,6.64),white,[(.60,1.46,0,2.05)],height=2.21)
upper_door('Lower white bedroom shared entry doorway',(12.15,5.70,0),90,'V8-V10; homeowner confirmation')
asset('Lower bedroom shell',photos='V9,V10',confidence='furniture and two corner windows observed; extent estimated')
box('Lower bedroom floor',(9.35,7.80,-.045),(3.0,4.40,.09),walnut)
partition('Lower bedroom back window wall',(7.85,10.0),(10.85,10.0),bed_wall,[(.25,1.6,.78,2.05)],height=2.21)
partition('Lower bedroom side window wall',(7.85,5.60),(7.85,10.0),bed_wall,[(1.99,3.39,.78,2.05)],height=2.21)
partition('Lower bedroom front wall',(7.85,5.60),(10.85,5.60),bed_wall,[(1.87,2.73,0,2.05)],height=2.21)
partition('Lower bedroom right wall',(10.85,5.60),(10.85,10.0),bed_wall,height=2.21)
upper_window('Lower bedroom far window',(8.78,9.99,1.415),1.35,0,'V9')
upper_window('Lower bedroom side window',(7.86,8.29,1.415),1.40,90,'V9,V10; House Tour 199s')
asset('Lower bathroom shell',photos='V8')
box('Lower bathroom wood floor',(11.50,7.84,-.02),(1.30,2.40,.055),oak)
partition('Lower bath end wall',(10.85,9.04),(12.15,9.04),white,[(.21,1.06,.95,2.03)],height=2.21)
partition('Lower bath left wall',(10.85,6.64),(10.85,9.04),white,height=2.21)
partition('Lower bath right wall',(12.15,6.64),(12.15,9.04),white,height=2.21)
upper_window('Lower bathroom window',(11.485,9.03,1.49),.85,0,'V8',with_curtains=False)

extension_collection('27 | Lower bedroom and bathroom furniture')
bed('Lower bedroom single bed',(8.95,9.35,.02),1.10,90,'V9; House Tour 197–200s')
box('Low grey upholstered headboard',(0,1.01,.66),(1.14,.075,.65),curtainmat,.045)
asset('Lower bedroom dark bookcase',(8.04,6.94,0),90,'V9,V10; House Tour 199s')
for x in [-.44,.44]:box('Tall bookcase side',(x,0,1.01),(.055,.30,2.02),walnut)
box('Dark bookcase back',(0,.145,1.01),(.92,.025,2.02),walnut)
for i in range(6):box('Tall bookcase shelf',(0,0,.05+i*.385),(.92,.32,.035),walnut)
for row in range(1,4):
    for i in range(8):
        box('Neatly shelved book',(-.35+i*.083,-.02,.07+row*.385+.13),(.057,.18,.25),[walnut,navy,linen,green][(i+row)%4],.003)
jeannie_walnut=material('Jeannie dark polished walnut',(.07,.025,.012),.30,texture='wood')
asset('Lower bedroom low dark cabinet',(8.17,8.20,0),90,'V9; House Tour 197.998/199s',
      confidence='dark cabinet with two shallow drawers above two doors observed; dimensions estimated')
box('Jeannie cupboard carcass',(0,0,.407),(.98,.43,.676),jeannie_walnut,.014)
box('Jeannie cupboard overhanging top',(0,0,.756),(1.025,.475,.036),jeannie_walnut,.012)
box('Jeannie cupboard base moulding',(0,-.005,.095),(1.005,.45,.055),jeannie_walnut,.01)
for x in [-.42,.42]:
    for y in [-.155,.155]:
        cylinder('Jeannie cupboard short turned foot',(x,y,.047),.031,.094,jeannie_walnut,16,.041)
for x in [-.237,.237]:
    panel('Jeannie shallow top drawer',x,-.231,.652,.447,.137,jeannie_walnut)
    sphere('Jeannie drawer brass pull',(x,-.277,.652),(.014,.018,.023),brass)
    panel('Jeannie tall lower cupboard door',x,-.231,.335,.447,.462,jeannie_walnut)
for x in [-.045,.045]:
    sphere('Jeannie cupboard brass pull',(x,-.278,.494),(.013,.018,.024),brass)
chest('Lower bedroom bedside drawer chest',(10.40,8.75,0),.55,.67,-90,3,1,'V9,V10; House Tour 200s')
# H201.002 shows a high shelf, dark hanging rail and a pale suspended net
# basket behind the gold curtain. H200.000 locates the curtained corner;
# neither image establishes the closet's width, depth or exact fittings.
asset('Lower bedroom curtained closet',(10.35,9.55,0),-90,'V10; House Tour 200/201.002s',
      confidence='high shelf, rail and hanging net basket observed; dimensions and clean contents estimated')
box('Closet pale backing',(0,.13,1.04),(.75,.025,2.08),white)
box('Jeannie closet high shelf',(0,0,1.94),(.76,.28,.035),white)
rod('Jeannie closet hanging rail',(-.34,-.04,1.80),(.34,-.04,1.80),.014,walnut)
# Keep the clean basket entirely behind the existing curtain plane. Its
# softly bowed net and two suspension cords are an estimated simple fit.
for x in [-.21,.21]:
    curve('Jeannie basket suspension cord',[(x*.82,-.04,1.81),
          (x*.94,-.048,1.59),(x,-.005,1.33)],.005,bedding)
for z,rx,ry in [(1.33,.21,.095),(1.04,.14,.065)]:
    curve('Jeannie basket bound rim',[(rx*math.cos(t),-.005+ry*math.sin(t),z)
          for t in [i*math.tau/40 for i in range(40)]],.006,bedding,True)
for i in range(14):
    a=i*math.tau/14
    curve('Jeannie basket gathered net base',[(.14*math.cos(a),-.005+.065*math.sin(a),1.04),
          (.07*math.cos(a),-.005+.0325*math.sin(a),1.022),(0,-.005,1.015)],.0025,bedding)
    for sign in [-1,1]:
        pts=[]
        for j in range(5):
            u=j/4; a=i*math.tau/14+sign*.75*u
            pts.append(((.14+.07*u)*math.cos(a),
                        -.005+(.065+.03*u)*math.sin(a),1.04+.29*u))
        curve('Jeannie basket crossed fabric net',pts,.0025,bedding)
for i in range(10):box('Gathered golden closet curtain',(-.36+i*.018,-.18+.014*math.cos(i),1.06),(.025,.027,2.12),shade,.006)
asset('Lower bathroom white vanity',(11.88,7.49,0),-90,'V8')
box('Lower bath cupboard',(0,0,.39),(.79,.48,.78),white)
for x in [-.19,.19]:panel('Lower bath door',x,-.25,.38,.36,.64,white)
basin('Lower bath white sink',(0,0),.81,.53,.82,.65,tilewhite)
curve('Lower bath chrome faucet',[(0,.24,.84),(0,.24,.98),(0,.05,.98),(0,0,.92)],.016,steel)
frame('Lower bath mirror',(0,.255,1.41),.77,.90,white,mirror)
asset('Lower bathroom toilet',(11.84,8.48,0),-90,'V8')
box('Lower toilet foot',(0,0,.19),(.27,.35,.38),tilewhite,.10)
basin('Lower toilet bowl',(0,-.07),.39,.56,.44,.28,tilewhite)
box('Lower toilet tank',(0,.23,.67),(.40,.18,.46),tilewhite,.06)

for cname in ['26 | Lower hall and additional room architecture','27 | Lower bedroom and bathroom furniture']:
    for obj in bpy.data.collections[cname].objects:
        if obj.parent is None:obj.location.z-=1.05

# V8 visibly shows pink shelving through the LEFT door. The white-curtain room
# therefore uses the right door. Rotate its complete shell/furniture together;
# a reflection would reverse the photographed window/bookcase arrangement.
bpy.context.view_layer.update()
white_bedroom_attachment = (Matrix.Translation((12.15,5.70,0)) @
                            Matrix.Rotation(-math.pi/2,4,'Z') @ Matrix.Translation((-10.15,-5.60,0)))
for cname in ['26 | Lower hall and additional room architecture','27 | Lower bedroom and bathroom furniture']:
    for obj in bpy.data.collections[cname].objects:
        if obj.parent is None and obj.name.startswith('Lower bedroom') and obj.name != 'Lower bedroom hall floor':
            obj.matrix_world=white_bedroom_attachment @ obj.matrix_world

# Reverse family-room view supplies the piano and gymnastics bar near the stairs.
COLL=bpy.data.collections['27 | Lower bedroom and bathroom furniture']
# V6 clarifies that the green piece is a low floor cushion, not the upright
# armchair inferred from the partly occluded first photo set.
old=bpy.data.objects.get('Lower olive lounge chair')
if old:
    for child in list(old.children):bpy.data.objects.remove(child,do_unlink=True)
    bpy.data.objects.remove(old,do_unlink=True)
    ASSETS[:]=[entry for entry in ASSETS if entry['name']!='Lower olive lounge chair']
copy_furniture('Upright wood piano','Lower room upright piano',(10.07,1.43,-1.025),90,'V6; House Tour 171s')
# House Tour 51/54s resolves the partly occluded living furniture. Keep the
# observed family-room instrument; retire the earlier living-room inference.
for name in ['Upright wood piano','Piano bench']:
    obsolete=bpy.data.objects[name]
    for child in list(obsolete.children):bpy.data.objects.remove(child,do_unlink=True)
    bpy.data.objects.remove(obsolete,do_unlink=True)
    ASSETS[:]=[entry for entry in ASSETS if entry['name']!=name]
# House Tour 168.748/170.250/172.517s put the tan chaise beside the piano with
# its back to the front window wall; the cushion and bar step north-east out of
# that spot (were at (11.20, .95)). Their axis is unverified and kept.
asset('Lower adjustable gymnastics bar',(11.30,1.50,-1.025),0,'V6,V7')
for x in [-.77,.77]:
    rod('Gym bar foot',(x,-.50,.04),(x,.50,.04),.026,bluegrey)
    rod('Gym bar upright',(x,0,.04),(x,0,1.55),.024,bluegrey)
rod('Gym horizontal practice bar',(-.77,0,1.55),(.77,0,1.55),.022,oak)
asset('Lower green floor gym cushion',(11.30,1.50,-1.0),0,'V6')
box('Clean folded green floor cushion',(0,0,.15),(1.38,.75,.30),green,.09)
# Beside the piano, backrest to the front wall, seat facing into the room (was
# (11.13, 1.98) at the stair foot facing +X). Clears the window sills by 1.5 cm.
asset('Lower tan armless lounge seat',(10.97,.48,-1.025),180,'V6; House Tour 168.748/170.250/172.517s')
box('Tan lounge seat cushion',(0,0,.37),(.70,.68,.19),linen,.075)
box('Tan armless seat back',(0,.29,.64),(.70,.13,.62),linen,.06)
for x in [-.26,.26]:
    for y in [-.24,.24]:box('Tan lounge seat foot',(x,y,.13),(.055,.055,.26),walnut)

extension_ceilings=extension_collection('28 | Extension ceilings - hidden for dollhouse')
asset('Front porch roof underside',photos='V4; House Tour 24/39s')
box('Porch white ceiling',(2.55,-.90,2.60),(5.20,1.90,.09),white)
box('Entry return ceiling',(6.45,-.90,2.64),(2.70,1.80,.08),white)
asset('Additional lower room ceilings',photos='V6,V8,V9')
for x,y,w,d in [(11.50,5.64,1.30,1.94),(14.35,6.50,4.40,3),(11.50,7.84,1.30,2.4)]:
    box('Lower extension ceiling',(x,y,1.20),(w,d,.08),white)
