"""Visible landscaping from photos 1–5 and V4–V5; distances are estimates.

No neighbouring houses, addresses, people or private photos are reproduced.
"""
yard_collection = collection('42 | Front and back yards')
lawn = material('Yard soft green lawn', (.19,.30,.085), .98, texture='fabric')
leaves = [material('Garden foliage '+str(i), c, .95) for i,c in enumerate([
    (.13,.25,.065),(.21,.34,.10),(.29,.37,.12),(.10,.20,.055)])]
bark = material('Garden tree bark',(.20,.14,.08),.98,texture='wood')
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

def shrub(name,pos,size,photo):
    asset(name,pos,photos=photo,confidence='planting observed; shape simplified')
    sphere('Leafy shrub canopy',(0,0,size[2]*.45),size,leaves[len(ASSETS)%len(leaves)])

def tree(name,pos,height,width,photo,willow=False):
    asset(name,pos,photos=photo,confidence='tree visible; species and size approximate')
    cylinder('Tree trunk',(0,0,height*.32),.19,height*.64,bark,12,top=.10)
    for i in range(7):
        a=i*math.tau/7
        x,y=math.cos(a)*width*.45,math.sin(a)*width*.45
        rod('Tree branch',(0,0,height*.38),(x,y,height*.67),.065,bark)
        sphere('Tree leafy crown',(x,y,height*.74+(i%2)*.45),(width*.58,width*.55,height*.23),leaves[i%4])
        if willow:
            for j in range(3):
                sphere('Drooping leafy bough',(x*1.45,y*1.45,height*.50-j*.32),(.35,.35,height*.20),leaves[(i+j)%4])

tree('Front large shade tree',(10,-12,yard_z),7.6,3.3,'V5')
tree('Front weeping tree',(4.2,-12.2,yard_z),5.6,2.5,'V5',True)
tree('Rear left shade tree',(-3.0,21,yard_z),7.5,2.7,'1,2')
tree('Rear lawn tree',(6.2,22,yard_z),7.2,2.5,'2,5')
tree('Rear right screening tree',(20,20,yard_z),7.0,2.8,'3,4')
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
