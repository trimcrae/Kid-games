"""Hand-authored portrait from visual reference. No image/3D model inference.

Blender 4.5: blender -b -t 4 --python build.py -- --output PATH --preview
All geometry, grooming, shaders and lighting are constructed below.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
p = argparse.ArgumentParser()
p.add_argument('--output', type=Path, default=Path(__file__).resolve().parent)
p.add_argument('--preview', action='store_true')
p.add_argument('--render', action='store_true')
p.add_argument('--samples', type=int, default=96)
p.add_argument('--frame', type=int, default=1)
p.add_argument('--clay', action='store_true')
args = p.parse_args(argv)
SOURCE_HASH=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
random.seed(7629)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32 if args.preview else args.samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.cycles.transparent_max_bounces = 8
scene.render.resolution_x = 600 if args.preview else 1440
scene.render.resolution_y = 700 if args.preview else 1680
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 240

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c
BODY = collection('01 | Custom person — hand-authored anatomy')
FACE = collection('02 | Facial anatomy and open mouth')
HAIR = collection('03 | Individually groomed hair and stubble')
GLASSES = collection('04 | Custom browline sunglasses')
FOOD = collection('05 | Hand-built loaded pizza')
SET = collection('06 | Sunny plaza')
LIGHT = collection('07 | Camera and daylight')
ACTIVE = BODY
HEAD = None

def srgb(c):
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)

def material(name, color, rough=.5, metal=0, subsurface=0, noise=0, bump=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*srgb(color),1)
    m.use_nodes = True
    n=m.node_tree.nodes; l=m.node_tree.links; b=n.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*srgb(color),1)
    b.inputs['Roughness'].default_value=rough
    b.inputs['Metallic'].default_value=metal
    b.inputs['Subsurface Weight'].default_value=subsurface
    b.inputs['Subsurface Radius'].default_value=(1,.38,.19)
    b.inputs['Subsurface Scale'].default_value=.008
    if noise:
        tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=noise
        tex.inputs['Detail'].default_value=3
        ramp=n.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position=.18
        ramp.color_ramp.elements[0].color=(*srgb(tuple(v*.84 for v in color)),1)
        ramp.color_ramp.elements[1].position=.82
        ramp.color_ramp.elements[1].color=(*srgb(tuple(min(1,v*1.08) for v in color)),1)
        l.new(tex.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],b.inputs['Base Color'])
        if bump:
            micro=n.new('ShaderNodeTexNoise');micro.inputs['Scale'].default_value=noise*14
            micro.inputs['Detail'].default_value=2
            bn=n.new('ShaderNodeBump');bn.inputs['Strength'].default_value=.22;bn.inputs['Distance'].default_value=bump
            l.new(micro.outputs['Fac'],bn.inputs['Height']);l.new(bn.outputs[0],b.inputs['Normal'])
    return m

skin=material('Skin | warm complexion, layered pores and subsurface',(.72,.48,.39),.48,subsurface=.14,noise=38,bump=.00024)
skin_ramp=next(n for n in skin.node_tree.nodes if n.type=='VALTORGB')
skin_ramp.color_ramp.elements[0].color=(*srgb((.70,.466,.380)),1)
skin_ramp.color_ramp.elements[1].color=(*srgb((.738,.495,.405)),1)
earskin=material('Ear rim | warm translucency',(.69,.36,.30),.47,subsurface=.22,noise=50,bump=.00014)
lips=material('Natural muted lip vermilion',(.55,.25,.23),.4,subsurface=.18,noise=80,bump=.0001)
oral=material('Mouth interior',(.14,.018,.027),.58,subsurface=.05)
tongue=material('Tongue',(.52,.17,.19),.35,subsurface=.2,noise=100,bump=.0001)
enamel=material('Warm ivory enamel',(.90,.85,.73),.22,subsurface=.06)
gum=material('Gumline',(.51,.18,.19),.43,subsurface=.18)
shirt=material('Charcoal cotton | fine knit',(.16,.175,.19),.85,noise=180,bump=.0004)
seam=material('Cotton seam thread',(.12,.13,.145),.85)
button=material('Smoke shell Henley buttons',(.44,.43,.39),.28)
hairmats=[material('Hair strand '+str(i),c,.43) for i,c in enumerate([(.08,.055,.044),(.12,.079,.058),(.18,.13,.10),(.30,.27,.25)])]
scalpmat=material('Dense hair undercoat',(.055,.040,.034),.72,noise=160,bump=.0006)
stubblemat=material('Short dark beard',(.12,.078,.059),.63)
black=material('Polished black acetate',(.018,.020,.023),.20)
metal=material('Brushed pale gold frame and wedding band',(.67,.62,.51),.22,metal=.92)
lens=material('Smoked green optical glass',(.030,.045,.041),.10,metal=.12)
bs=lens.node_tree.nodes.get('Principled BSDF')
bs.inputs['Transmission Weight'].default_value=.25
bs.inputs['IOR'].default_value=1.52
crust=material('Golden irregular baked crust',(.66,.31,.075),.7,noise=70,bump=.0017)
crumb=material('Crisp toasted crumbs',(.70,.34,.105),.8,noise=95,bump=.0006)
cheese=material('Glossy melted golden cheese',(.95,.57,.12),.29,subsurface=.08,noise=32,bump=.00025)
sauce=material('Roasted tomato sauce',(.48,.095,.035),.4,noise=45,bump=.0006)
cabbage=material('Purple cabbage cut edge',(.43,.045,.19),.36,subsurface=.10)
cabbagewhite=material('Pale cabbage core',(.91,.78,.78),.42,subsurface=.12)
herb=material('Fresh chopped scallion',(.28,.49,.055),.45)
stucco=material('Warm pale plaster',(.81,.75,.58),.82,noise=16,bump=.002)
stone=material('Grey plaza stone',(.46,.47,.45),.86,noise=10,bump=.0014)
iron=material('Painted iron fence',(.065,.075,.055),.52,metal=.5)
wood=material('Plane-tree bark',(.35,.32,.23),.88,noise=5,bump=.014)
leaves=[material('Living foliage '+str(i),c,.62,subsurface=.08) for i,c in enumerate([(.19,.30,.055),(.32,.43,.10),(.40,.51,.14),(.16,.24,.06)])]

def place(obj, mat=None, parent=None):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    ACTIVE.objects.link(obj)
    if mat: obj.data.materials.append(mat)
    if parent: obj.parent=parent
    return obj

def mesh(name,verts,faces,mat,parent=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);ACTIVE.objects.link(obj)
    if mat:data.materials.append(mat)
    if parent:obj.parent=parent
    for poly in data.polygons:poly.use_smooth=True
    return obj

def ellipsoid(name,loc,scale,mat,parent=None,segments=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=32,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return place(o,mat,parent)

def cube(name,loc,size,mat,bevel=.002,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
        mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return place(o,mat,parent)

def curves(name,paths,radius,mat,parent=None,resolution=2):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=2
    data.bevel_depth=radius;data.bevel_resolution=resolution
    for pts in paths:
        s=data.splines.new('POLY');s.points.add(len(pts)-1)
        for i,pt in enumerate(pts):
            s.points[i].co=(*pt[:3],1)
            if len(pt)>3:s.points[i].radius=pt[3]
    o=bpy.data.objects.new(name,data);ACTIVE.objects.link(o)
    if mat:data.materials.append(mat)
    if parent:o.parent=parent
    return o

def curve(name,pts,radius,mat,parent=None):return curves(name,[pts],radius,mat,parent)

def limb(name,a,b,r1,r2,mat,parent=None,rings=24,sides=48,fold=0):
    a=Vector(a);b=Vector(b);axis=(b-a).normalized()
    u=axis.cross(Vector((0,1,0))).normalized()
    if u.length<.1:u=axis.cross(Vector((1,0,0))).normalized()
    v=axis.cross(u).normalized();verts=[];faces=[]
    for j in range(rings+1):
        t=j/rings;center=a.lerp(b,t)
        radius=(r1*(1-t)+r2*t)*(1+.07*math.sin(math.pi*t))
        for i in range(sides):
            q=2*math.pi*i/sides
            rr=radius*(1+fold*math.sin(q*9+t*28)*math.sin(math.pi*t))
            pos=center+rr*(u*math.cos(q)+v*math.sin(q))
            verts.append(pos)
    for j in range(rings):
        for i in range(sides):
            k=j*sides+i;n=j*sides+(i+1)%sides
            faces.append((k,n,n+sides,k+sides))
    faces.append(tuple(range(sides-1,-1,-1)))
    faces.append(tuple(rings*sides+i for i in range(sides)))
    return mesh(name,verts,faces,mat,parent)

def smooth_union(objects,name,voxel=.0015,iterations=4):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();o=bpy.context.object;o.name=name
    rem=o.modifiers.new('Sculpted continuous surface','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;rem.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    sm=o.modifiers.new('Relax sculpt','SMOOTH');sm.factor=.6;sm.iterations=iterations
    bpy.ops.object.modifier_apply(modifier=sm.name)
    return o

# Continuous torso mesh: subtle asymmetric cloth folds change its silhouette.
verts=[];faces=[];N=128;R=72
for j in range(R+1):
    t=j/R;z=.60+.775*t
    rx=.187+.039*math.sin(math.pi*t)+.012*t
    ry=.118+.035*math.sin(math.pi*t)
    if t>.83:rx*=1-.08*((t-.83)/.17)
    for i in range(N):
        a=2*math.pi*i/N
        wrinkle=.003*math.sin(11*a+26*t)+.002*math.sin(19*a-45*t)
        wrinkle*=math.sin(math.pi*t)
        x=(rx+wrinkle)*math.sin(a)
        y=-(ry+wrinkle)*math.cos(a)
        zz=z-.035*abs(math.sin(a))*t**8
        verts.append((x,y,zz))
for j in range(R):
    for i in range(N):
        k=j*N+i;n=j*N+(i+1)%N;faces.append((k,n,n+N,k+N))
faces.append(tuple(range(N-1,-1,-1)))
faces.append(tuple(R*N+i for i in range(N)))
torso=mesh('Henley shirt | draped cotton torso',verts,faces,shirt)
# Close the shoulder surface into the neckline with a draped annular mesh.
sv=[];sf=[]
for j in range(17):
    t=j/16
    for i in range(N):
        a=math.tau*i/N
        outer=Vector(verts[R*N+i])
        inner=Vector((.082*math.sin(a),-.078*math.cos(a),1.379-.047*max(0,math.cos(a))))
        q=outer.lerp(inner,t);q.z+=.009*math.sin(math.pi*t)
        sv.append(q)
for j in range(16):
    for i in range(N):
        k=j*N+i;n=j*N+(i+1)%N;sf.append((k,n,n+N,k+N))
mesh('Shoulder cloth into neckline',sv,sf,shirt)
ellipsoid('Neck and trapezius',(0,.012,1.392),(.072,.070,.105),skin)
# A collar follows a sloping neckline and overlaps the shoulder seam naturally.
collar=[]
for i in range(101):
    a=2*math.pi*i/100
    collar.append((.082*math.sin(a),-.078*math.cos(a),1.379-.047*max(0,math.cos(a))))
curve('Double-stitched collar',collar,.006,shirt)
curve('Collar edge stitching',[(x,y-.001,z+.003) for x,y,z in collar],.0005,seam)
placket=cube('Henley button placket',(.007,-.153,1.252),(.022,.004,.17),shirt,.002)
curve('Placket topstitch left',[(-.002,-.157,1.34),(-.003,-.158,1.18)],.00045,seam)
for k,z in enumerate([1.31,1.255,1.20]):
    o=ellipsoid('Shell button '+str(k),(.008,-.159,z),(.0045,.0018,.0045),button,segments=24)
    for dx in [-.001,.001]:
        ellipsoid('Button sewing hole',(.008+dx,-.1608,z),(.00055,.0004,.00055),seam,segments=12)

# Sleeves and the two differently posed arms.
limb('Left short sleeve',(-.173,0,1.318),(-.265,-.006,1.142),.092,.074,shirt,fold=.035)
limb('Left upper arm',(-.26,-.004,1.17),(-.285,-.025,.92),.066,.052,skin)
limb('Left forearm',(-.285,-.025,.93),(-.27,-.105,.59),.051,.032,skin)
limb('Right short sleeve',(.168,.014,1.31),(.285,-.010,1.17),.089,.073,shirt,fold=.045)
smooth_union([torso,bpy.data.objects['Left short sleeve'],bpy.data.objects['Right short sleeve']],
             'Henley | continuous torso and sleeves',.0025,5)
bpy.data.objects.remove(bpy.data.objects['Shoulder cloth into neckline'],do_unlink=True)
upper=limb('Right exposed upper arm',(.27,-.009,1.19),(.355,-.018,1.07),.067,.051,skin)
fore=limb('Raised right forearm',(.355,-.018,1.07),(.274,-.101,1.468),.056,.032,skin)
elbow=ellipsoid('Right elbow',(.355,-.018,1.076),(.056,.055,.060),skin)
smooth_union([upper,fore,elbow],'Right arm | sculpted bend',.002,4)
for side,x,z in [('left',-.264,1.142),('right',.284,1.17)]:
    # Fine curved stitching around sleeve cuffs.
    pts=[(x+.067*math.cos(a),-.006+.067*math.sin(a),z) for a in [i*2*math.pi/72 for i in range(73)]]
    curve(side+' sleeve cuff stitch',pts,.00055,seam)

# A single parent lets the whole anatomically constructed head turn as one asset.
ACTIVE=FACE
HEAD=bpy.data.objects.new('Head pose | turn toward the food',None);FACE.objects.link(HEAD)
HEAD.location=(0,0,1.43)
HEAD.rotation_euler=(math.radians(5),math.radians(-2),math.radians(19))
def hp(point):return (point[0],point[1],point[2]-1.43)
def he(name,loc,scale,mat,segments=48):return ellipsoid(name,hp(loc),scale,mat,HEAD,segments)
def hc(name,pts,r,mat):return curve(name,[hp(v) for v in pts],r,mat,HEAD)

levels=[(1.424,.012,.022,.002),(1.436,.049,.047,-.012),(1.454,.073,.067,-.001),
 (1.478,.089,.077,.007),(1.51,.097,.087,.013),(1.55,.105,.091,.012),
 (1.588,.109,.091,.010),(1.624,.106,.090,.010),(1.662,.104,.088,.015),
 (1.697,.096,.081,.020),(1.730,.079,.068,.026),(1.754,.052,.048,.030),(1.770,.004,.007,.031)]
def profile(z):
    for j in range(len(levels)-1):
        a,b=levels[j:j+2]
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);return tuple(a[k]*(1-t)+b[k]*t for k in [1,2,3])
    return levels[0][1:] if z<levels[0][0] else levels[-1][1:]
def facepoint(a,z):
    rx,ry,cy=profile(z)
    x=rx*math.sin(a);y=cy-ry*math.cos(a)
    front=max(0,math.cos(a))**6
    # Sculpt cheekbone, brow, chin and nasolabial topography into the mesh.
    y-=front*(.012*math.exp(-((z-1.457)/.027)**2)+.014*math.exp(-((z-1.65)/.021)**2))
    y-=.015*math.exp(-((abs(x)-.057)/.023)**2-((z-1.582)/.034)**2)*max(0,math.cos(a))
    y+=.011*math.exp(-((abs(x)-.046)/.027)**2-((z-1.617)/.016)**2)*front
    return (x,y,z)
verts=[];faces=[];N=192;R=150
for j in range(R+1):
    z=1.424+(1.770-1.424)*j/R
    for i in range(N):verts.append(hp(facepoint(2*math.pi*i/N,z)))
for j in range(R):
    for i in range(N):
        k=j*N+i;n=j*N+(i+1)%N;faces.append((k,n,n+N,k+N))
faces.append(tuple(range(N-1,-1,-1)))
faces.append(tuple(R*N+i for i in range(N)))
base=mesh('Hand-shaped facial surface',verts,faces,skin,HEAD)
nose=[base,
 he('Nose bridge',(0,-.090,1.604),(.018,.024,.046),skin),
 he('Nose dorsum',(0,-.101,1.585),(.018,.024,.032),skin),
 he('Nose tip',(0,-.115,1.57),(.023,.023,.017),skin),
 he('Left nasal ala',(-.020,-.111,1.561),(.013,.021,.011),skin),
 he('Right nasal ala',(.020,-.111,1.561),(.013,.021,.011),skin)]
head=smooth_union(nose,'Face | continuous sculpted skin',.0011,4)
head.data.materials.append(oral)
# Extruding the mouth outline produces a precise aperture, independent of cheek depth.
mv=[];mf=[];MN=128
for y in [-.23,-.032]:
    for i in range(MN):
        a=math.tau*i/MN;mv.append(hp((.049*math.cos(a),y,1.513+.039*math.sin(a))))
mf.extend([tuple(range(MN-1,-1,-1)),tuple(MN+i for i in range(MN))])
for i in range(MN):mf.append((i,(i+1)%MN,(i+1)%MN+MN,i+MN))
cutter=mesh('Temporary open-mouth sculpting tool',mv,mf,oral,HEAD)
bpy.context.view_layer.objects.active=head
mod=head.modifiers.new('Open mouth cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
he('Dark oral cavity',(0,-.041,1.511),(.053,.015,.043),oral)
he('Tongue behind lower lip',(0,-.063,1.484),(.034,.020,.009),tongue)
for side in [-1,1]:
    he('Nostril recess '+str(side),(side*.017,-.123,1.556),(.005,.0035,.0028),oral,32)
# Lips follow the open mouth's elliptical opening and taper at the corners.
upper=[];lower=[]
for i in range(65):
    a=math.pi*i/64
    x=.049*math.cos(a)
    uz=1.513+.039*math.sin(a)-.0015*math.exp(-(x/.010)**2)
    lz=1.513-.039*math.sin(a)
    ua=math.asin(x/profile(uz)[0]);la=math.asin(-x/profile(lz)[0])
    upper.append((x,facepoint(ua,uz)[1]-.0025,uz))
    lower.append((-x,facepoint(la,lz)[1]-.003,lz))
hc('Upper lip sculpt',upper,.0023,lips)
hc('Lower lip sculpt',lower,.003,lips)
hc('Upper gum arch',[(.049*math.cos(a),-.075-.015*math.sin(a),1.541) for a in [i*math.pi/64 for i in range(65)]],.004,gum)
for i in range(9):
    x=(i-4)*.0095;side=abs(i-4)
    z=1.535-.002*side
    y=-.078+.014*(x/.049)**2
    tooth=cube('Upper tooth %02d'%i,hp((x,y,z)),(.0091 if side<2 else .008,.009,.014 if side<2 else .012),enamel,.0024,HEAD)
    tooth.rotation_euler.z=-x*3
for i in range(7):
    x=(i-3)*.009
    cube('Lower tooth %02d'%i,hp((x,-.074+.005*(x/.03)**2,1.486)),(.0083,.008,.009),enamel,.002,HEAD)

# Ears have a concave concha and separate folded helix, tragus and lobule.
for side in [-1,1]:
    he('Ear base '+str(side),(side*.106,.013,1.594),(.017,.027,.048),earskin)
    he('Ear concha shadow '+str(side),(side*.118,-.003,1.596),(.0035,.014,.024),lips)
    paths=[]
    for i in range(65):
        a=2*math.pi*i/64
        paths.append((side*(.116+.004*math.sin(a)),.012-.023*math.cos(a),1.596+.042*math.sin(a)))
    hc('Rolled ear helix '+str(side),paths,.0045,skin)
    hc('Inner antihelix '+str(side),[(side*.122,.012,1.622),(side*.124,-.004,1.616),(side*.123,-.006,1.599),(side*.122,.002,1.582)],.0032,skin)
    he('Ear lobule '+str(side),(side*.110,.008,1.557),(.010,.014,.014),skin)

# Dark swept quiff: a shaped cap beneath thousands of tapered individual strands.
ACTIVE=HAIR
def hairpoint(a,t):
    front=max(0,math.cos(a));back=max(0,-math.cos(a))
    bottom=1.595+.086*front**2-.053*back
    lat=t*math.pi/2
    x=.114*math.sin(a)*math.cos(lat)
    y=.016-.111*math.cos(a)*math.cos(lat)+.018*t
    z=bottom+(1.798-bottom)*math.sin(lat)+.016*front*math.sin(math.pi*t)
    return Vector((x,y,z))
verts=[];faces=[];N=128;R=48
for j in range(R+1):
    for i in range(N):verts.append(hp(hairpoint(2*math.pi*i/N,j/R)))
for j in range(R):
    for i in range(N):
        k=j*N+i;n=j*N+(i+1)%N;faces.append((k,n,n+N,k+N))
mesh('Sculpted quiff undercoat',verts,faces,scalpmat,HEAD)
grooms=[[] for _ in hairmats]
for i in range(10500):
    a=random.uniform(0,2*math.pi);t=random.uniform(0,.96)
    length=random.uniform(.045,.16)*(1-.38*t)
    points=[]
    for j in range(7):
        f=j/6
        pt=hairpoint(a+.19*f*(.3+t),min(.997,t+length*f))
        pt.z+=.0015+.003*math.sin(math.pi*f)+random.uniform(-.00035,.00035)
        points.append((*hp(pt),max(.08,1-.91*f)))
    k=random.choices(range(4),[.61,.27,.10,.02])[0]
    grooms[k].append(points)
for k,paths in enumerate(grooms):curves('Swept individual hair '+str(k),paths,.00018,hairmats[k],HEAD,1)
# Compress the overly tall first-pass crown into a shorter, broader swept quiff.
for obj in HAIR.objects:
    if obj.type=='MESH':
        for v in obj.data.vertices:
            z=v.co.z+1.43
            if z>1.65:v.co.z=1.65+(z-1.65)*.78-1.43
            v.co.x*=1.055
    elif obj.type=='CURVE':
        for spline in obj.data.splines:
            for q in spline.points:
                z=q.co.z+1.43
                if z>1.65:q.co.z=1.65+(z-1.65)*.78-1.43
                q.co.x*=1.055
for v in head.data.vertices:
    z=v.co.z+1.43
    if z>1.65:v.co.z=1.65+(z-1.65)*.78-1.43
# Sideburns and a short, uneven beard. Hair roots sit on the authored surface.
beard=[];silver=[]
for i in range(15500):
    a=random.uniform(-1.67,1.67);z=random.uniform(1.437,1.617)
    x,y,_=facepoint(a,z)
    cutoff=1.551+.055*(abs(x)/.11)**1.5
    if z>cutoff:continue
    if (x/.058)**2+((z-1.512)/.045)**2<1.12:continue
    if abs(x)<.030 and z>1.547:continue
    if random.random()<.35 and z>1.56:continue
    root=Vector((x,y-.0005,z));length=random.uniform(.0007,.0025)
    tip=root+Vector((random.uniform(-.0004,.0004),-.0006,-length))
    path=[(*hp(root),.7),(*hp((root+tip)*.5),1),(*hp(tip),.08)]
    (silver if random.random()<.08 else beard).append(path)
curves('Individually placed short beard hairs',beard,.000075,stubblemat,HEAD,1)
curves('Scattered grey beard hairs',silver,.000065,hairmats[3],HEAD,1)
mustache=[]
for i in range(1200):
    x=random.uniform(-.045,.045);z=random.uniform(1.550,1.560)
    if abs(x)<.004:continue
    y=-.090-.008*(1-abs(x)/.05)
    mustache.append([(*hp((x,y,z)),.8),(*hp((x+math.copysign(.001,x),y-.001,z-.0035)),.08)])
curves('Natural trimmed mustache',mustache,.00009,stubblemat,HEAD,1)

# Browline sunglasses: hand-traced lens outlines and actual curved metal rims.
ACTIVE=GLASSES
def lensoutline(side):
    pts=[]
    for i in range(96):
        a=2*math.pi*i/96
        # Rounded rectangular superellipse with the outer corner raised.
        xx=math.copysign(abs(math.cos(a))**.63,math.cos(a))
        zz=math.copysign(abs(math.sin(a))**.70,math.sin(a))
        x=side*(.050+.041*xx);z=1.610+.032*zz+.003*xx
        y=-.107+.12*x*x
        pts.append((x,y,z))
    return pts
for side in [-1,1]:
    outline=lensoutline(side);center=Vector((side*.05,-.111,1.610))
    vs=[hp(center)];fs=[]
    for ring in range(1,9):
        f=ring/8
        for pt in outline:
            q=center.lerp(Vector(pt),f);q.y-=.003*math.sin(math.pi*f)
            vs.append(hp(q))
    for i in range(96):fs.append((0,1+i,1+(i+1)%96))
    for r in range(7):
        for i in range(96):
            k=1+r*96+i;n=1+r*96+(i+1)%96;fs.append((k,n,n+96,k+96))
    o=mesh('Curved smoked lens '+str(side),vs,fs,lens,HEAD)
    mod=o.modifiers.new('Optical glass thickness','SOLIDIFY');mod.thickness=.0015
    hc('Fine metal lens rim '+str(side),outline+[outline[0]],.0011,metal)
    top=[pt for pt in outline if pt[2]>1.622]
    # Select the continuous upper arc explicitly, avoiding the outline seam.
    top=sorted(top,key=lambda p:p[0])
    hc('Black acetate brow '+str(side),[(x,y-.001,z) for x,y,z in top],.0038,black)
    hc('Temple arm '+str(side),[(side*.091,-.107,1.632),(side*.111,-.076,1.626),(side*.119,.008,1.620),(side*.113,.032,1.596)],.003,black)
    he('Hinge plate '+str(side),(side*.093,-.105,1.632),(.004,.002,.006),metal,24)
hc('Arched metal nose bridge',[(-.009,-.113,1.624),(-.005,-.118,1.627),(0,-.120,1.628),(.005,-.118,1.627),(.009,-.113,1.624)],.0014,metal)

# The food is a substantial, irregular piece with a crumb-covered edge.
ACTIVE=FOOD
PIZZA=bpy.data.objects.new('Loaded pizza | editable assembly',None);FOOD.objects.link(PIZZA)
PIZZA.location=(.145,-.145,1.472)
PIZZA.rotation_euler=(math.radians(27),math.radians(-8),math.radians(-5))
outline=[(-.108,.057),(-.078,.073),(-.035,.078),(.014,.086),(.065,.077),(.105,.042),(.104,-.018),(.062,-.075),(.010,-.105),(-.049,-.083),(-.089,-.040)]
vs=[]
for z in [-.010,.006]:vs.extend([(x,y,z) for x,y in outline])
n=len(outline);fs=[tuple(range(n-1,-1,-1)),tuple(n+i for i in range(n))]
fs.extend([(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)])
base=mesh('Hand-shaped crispy pizza base',vs,fs,crust,PIZZA)
bev=base.modifiers.new('Soft crumb edge','BEVEL');bev.width=.009;bev.segments=4
cheese_edge=[(x*.86,y*.86,.015+.0018*math.sin(i*2.7)) for i,(x,y) in enumerate(outline)]
cheese_vs=[(0,0,.015)]+cheese_edge
cheese_fs=[(0,1+i,1+(i+1)%n) for i in range(n)]
cheese_bed=mesh('Irregular melted cheese surface',cheese_vs,cheese_fs,cheese,PIZZA)
mod=cheese_bed.modifiers.new('Melted layer thickness','SOLIDIFY');mod.thickness=.005
def inside(x,y):
    odd=False;j=len(outline)-1
    for i in range(len(outline)):
        xi,yi=outline[i];xj,yj=outline[j]
        if ((yi>y)!=(yj>y)) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:odd=not odd
        j=i
    return odd
# Small irregular crumbs use one combined mesh, preserving realistic scale.
cv=[];cf=[]
for i in range(2300):
    x=random.uniform(-.112,.108);y=random.uniform(-.105,.086)
    if not inside(x,y):continue
    r=random.uniform(.0008,.0025);z=random.uniform(.004,.011)
    start=len(cv)
    for q in [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]:
        cv.append((x+r*q[0],y+r*q[1],z+r*q[2]))
    for f in [(0,2,4),(2,1,4),(1,3,4),(3,0,4),(2,0,5),(1,2,5),(3,1,5),(0,3,5)]:cf.append(tuple(start+k for k in f))
mesh('Thousands of individually shaped toasted crumbs',cv,cf,crumb,PIZZA)
for i in range(18):
    x=random.uniform(-.08,.08);y=random.uniform(-.065,.055)
    if not inside(x,y):continue
    ellipsoid('Roasted sauce pocket %02d'%i,(x,y,.016),(random.uniform(.010,.022),.011,.003),sauce,PIZZA,24)
for k in range(4):
    pts=[]
    for i in range(50):
        x=-.084+i*.0034;y=-.050+k*.031+.008*math.sin(i*.25+k)
        pts.append((x,y,.025+.002*math.sin(i*.31)))
    curve('Melted golden cheese ribbon '+str(k),pts,.0038,cheese,PIZZA)
for i in range(60):
    x=random.uniform(-.075,.08);y=random.uniform(-.065,.06);a=random.uniform(0,math.tau);length=random.uniform(.014,.041)
    pts=[]
    for j in range(8):
        t=j/7-.5;pts.append((x+math.cos(a)*length*t,y+math.sin(a)*length*t,.030+.004*math.cos(t*math.pi)+random.uniform(-.001,.001)))
    curve('Curled cabbage shred %02d'%i,pts,random.uniform(.0012,.0023),cabbage if i%3 else cabbagewhite,PIZZA)
for i in range(20):
    x=random.uniform(-.08,.085);y=random.uniform(-.06,.06)
    o=cube('Chopped scallion %02d'%i,(x,y,.035),(.007,.004,.003),herb,.0007,PIZZA)
    o.rotation_euler.z=random.uniform(0,math.tau)
roll=ellipsoid('Golden blistered raised crust',(.030,.069,.031),(.048,.020,.019),crust,PIZZA)
for i in range(35):
    a=random.uniform(0,math.tau);r=random.uniform(0,.8)
    ellipsoid('Toasted crust blister',(.030+.045*r*math.cos(a),.069+.018*r*math.sin(a),.043+random.uniform(0,.005)),(.003,.004,.0015),crumb,PIZZA,12)

# Palm and separate articulated fingers curl around the back crust.
ACTIVE=BODY
hand_objects_before=set(o.name for o in BODY.objects)
palm=ellipsoid('Gripping right palm',(.292,-.224,1.511),(.043,.023,.058),skin)
fingers=[]
for i,(x,z,length) in enumerate([(.240,1.557,.067),(.260,1.568,.074),(.282,1.566,.073),(.304,1.553,.059)]):
    a=(x,-.222,z-.037);b=(x,-.260,z);c=(x,-.282,z-.014);d=(x,-.278,z-.036)
    parts=[limb('Finger %d proximal'%i,a,b,.009,.009,skin),limb('Finger %d middle'%i,b,c,.009,.008,skin),limb('Finger %d distal'%i,c,d,.008,.0067,skin),ellipsoid('Knuckle %d'%i,b,(.0095,.010,.010),skin)]
    finger=smooth_union(parts,'Curled finger %d'%i,.001,3);fingers.append(finger)
    nail=ellipsoid('Rounded fingernail %d'%i,(x,-.285,z-.028),(.0058,.0014,.008),material('Nail plate %d'%i,(.76,.58,.50),.32,subsurface=.05),segments=24)
    curve('Finger crease %d'%i,[(x-.005,-.285,z-.017),(x,-.286,z-.018),(x+.005,-.285,z-.017)],.0003,lips)
thumbparts=[limb('Thumb base',(.270,-.23,1.496),(.242,-.258,1.49),.016,.012,skin),limb('Thumb tip',(.242,-.258,1.49),(.224,-.26,1.516),.012,.010,skin)]
smooth_union(thumbparts,'Supporting thumb',.0012,3)
# A real metal ring sits on the ring finger.
pts=[(.282+.010*math.cos(a),-.234+.011*math.sin(a),1.544) for a in [math.tau*j/64 for j in range(65)]]
curve('Wedding ring',pts,.0025,metal)
for obj in BODY.objects:
    if obj.name not in hand_objects_before:
        obj.location+=Vector((-.035,.13,-.02))

# Hand-built architectural set, out of focus at portrait distances.
ACTIVE=SET
for ix in range(-10,11):
    for iy in range(-3,24):
        o=cube('Plaza paving slab',(ix*.46,iy*.46,-.04),(.452,.452,.07),stone,.004)
        o.location.z+=random.uniform(-.001,.001)
cube('Pale building facade',(1.5,8,3.6),(7,.40,7.2),stucco,.03)
trim=material('Patinated blue-green architectural trim',(.19,.32,.34),.67)
windowmat=material('Shaded blue window glass',(.13,.19,.20),.2,metal=.25)
for x in [-.8,1.3,3.4]:
    cube('Tall recessed window',(x,7.77,2.9),(1.04,.07,2.0),windowmat,.10)
    for dx in [-.56,.56]:cube('Window vertical surround',(x+dx,7.7,2.9),(.09,.12,2.25),trim,.02)
    cube('Window sill',(x,7.65,1.8),(1.3,.25,.12),trim,.015)
    cube('Window transom',(x,7.65,3.5),(1.13,.09,.06),trim,.01)
pts=[(1.3+.60*math.cos(a),7.74,5.4+.60*math.sin(a)) for a in [math.tau*i/96 for i in range(97)]]
curve('Round upper window stone frame',pts,.06,trim)
o=ellipsoid('Round window dark glazing',(1.3,7.78,5.4),(.56,.02,.56),windowmat)
for a in [0,math.pi/2,math.pi/4,-math.pi/4]:
    curve('Circular window muntin',[(1.3-.55*math.cos(a),7.71,5.4-.55*math.sin(a)),(1.3+.55*math.cos(a),7.71,5.4+.55*math.sin(a))],.022,trim)
cube('Raised planting bed',(-2.4,3.9,.20),(1.8,7.5,.4),stucco,.05)
for y in [i*.22 for i in range(34)]:
    limb('Iron fence upright',(-1.43,y,.35),(-1.43,y,1.0),.011,.011,iron,rings=2,sides=10)
for z in [.43,.91,1.02]:curve('Fence rail',[(-1.43,0,z),(-1.43,7.3,z)],.015,iron)
# Each leafy tree consists of actual branching wood and individual folded leaves.
for ti,(x,y,height) in enumerate([(-2.3,1.8,4.1),(-2.5,4.6,4.8),(3.6,6.0,4.7)]):
    limb('Tree trunk '+str(ti),(x,y,.35),(x+.12,y,height*.72),.12,.055,wood,rings=16,sides=18)
    for j in range(9):
        a=j*2.4;start=(x+.1,y,height*.48)
        end=(x+math.cos(a)*1.1,y+math.sin(a)*1.05,height*.75+random.uniform(-.25,.5))
        limb('Tree branch',start,end,.045,.010,wood,rings=7,sides=10)
    lv=[];lf=[]
    for j in range(3200):
        a=random.uniform(0,math.tau);c=random.uniform(-1,1);r=random.random()**(1/3)
        center=Vector((x+1.65*r*math.sqrt(1-c*c)*math.cos(a),y+1.40*r*math.sqrt(1-c*c)*math.sin(a),height+.9*r*c))
        u=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-.3,.3))).normalized()*.07
        v=Vector((-u.y,u.x,random.uniform(-.035,.035)))*.55
        k=len(lv);lv.extend([center-u,center+v,center+Vector((0,0,.008)),center+u,center-v])
        lf.extend([(k,k+1,k+2),(k+1,k+3,k+2),(k+3,k+4,k+2),(k+4,k,k+2)])
    o=mesh('Individually folded leaves '+str(ti),lv,lf,leaves[0])
    for mat in leaves[1:]:o.data.materials.append(mat)
    for face in o.data.polygons:face.material_index=random.randrange(4)

# Light transport and portrait camera. No photographic background or texture maps.
ACTIVE=LIGHT
world=bpy.data.worlds.new('Clear blue daylight');world.use_nodes=True;scene.world=world
wn=world.node_tree.nodes;wl=world.node_tree.links
sky=wn.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(52);sky.sun_rotation=math.radians(235);sky.sun_disc=False
wl.new(sky.outputs[0],wn.get('Background').inputs[0]);wn.get('Background').inputs[1].default_value=.22
data=bpy.data.lights.new('Warm direct midday sun','SUN');data.energy=2.2;data.angle=math.radians(2.0)
sun=bpy.data.objects.new('Warm direct midday sun',data);LIGHT.objects.link(sun);sun.rotation_euler=(math.radians(27),math.radians(-25),math.radians(-28))
data=bpy.data.lights.new('Soft reflected plaza light','AREA');data.energy=85;data.shape='DISK';data.size=2.0
fill=bpy.data.objects.new('Soft reflected plaza light',data);LIGHT.objects.link(fill);fill.location=(-1,-2,2.2);fill.rotation_euler=(Vector((0,0,1.4))-fill.location).to_track_quat('-Z','Y').to_euler()
focus=bpy.data.objects.new('Focus | eyes and food',None);LIGHT.objects.link(focus);focus.location=(.075,-.12,1.57)
data=bpy.data.cameras.new('Portrait camera');cam=bpy.data.objects.new('Portrait camera',data);LIGHT.objects.link(cam);scene.camera=cam
data.lens=85;data.sensor_width=36;data.dof.use_dof=True;data.dof.focus_object=focus;data.dof.aperture_fstop=5.6;data.dof.aperture_blades=9
target=Vector((.055,-.08,1.49))
for frame,angle,elev in [(1,-4,1.72),(61,-24,1.76),(121,16,1.68),(181,32,1.73),(240,-4,1.72)]:
    a=math.radians(angle)
    cam.location=(target.x+1.45*math.sin(a),target.y-1.45*math.cos(a),elev)
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
scene.frame_set(args.frame)
scene['asset_provenance']='All meshes, curves and materials hand-authored in build.py. No AI reconstruction, stock human, image texture or photograph projection.'
scene['quality_status']='Draft requiring visual review against the reference.'
scene['generator_sha256']=SOURCE_HASH
scene['reference']='User-provided adult eating pizza photograph; private visual reference only.'
guide=bpy.data.texts.new('READ ME | Hand-authored pizza portrait')
guide.write(scene['asset_provenance']+'\n\nSingle-image likeness study: unseen anatomy is artistic interpretation.\nTen-second camera route is keyed at 24 fps.\nQuality must be reviewed before publishing a final video.\n')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
if args.clay:
    clay=material('Neutral clay inspection',(.6,.6,.6),.65)
    scene.view_layers[0].material_override=clay
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pizza-portrait.blend'),compress=True)
report={'blender':bpy.app.version_string,'generator_sha256':SOURCE_HASH,'objects':len(scene.objects),'mesh_objects':sum(o.type=='MESH' for o in scene.objects),'image_textures':len([im for im in bpy.data.images if im.source=='FILE']),
        'method':scene['asset_provenance'],'status':scene['quality_status']}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
if args.render or args.preview:
    scene.render.filepath=str(OUT/('preview-%03d.png'%args.frame if args.preview else 'portrait.png'))
    bpy.ops.render.render(write_still=True)
print('HAND-AUTHORED SCENE SAVED',OUT,flush=True)
