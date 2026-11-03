"""Build an editable Blender model + GLB from the browser's shared specification.

node models/master-kim/export-model.mjs /tmp/master-kim.json
blender -b --python models/master-kim/build.py -- /tmp/master-kim.json /tmp/master-kim
Output uses local metres, Blender +Z up; GLB uses standard +Y up.
No private photo is read, copied, packed or exported.
"""
import bpy, json, sys, math
from pathlib import Path
from mathutils import Euler, Vector
args=sys.argv[sys.argv.index('--')+1:]
data=json.loads(Path(args[0]).read_text());dest=Path(args[1]);dest.mkdir(parents=True,exist_ok=True)
root=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
origin=data['origin'];materials={};buckets={}
names=['logo','welcome','exterior','exit','motto','tenets','olympic','rings','us','korea','tenetPoster','promise','award','abstract','best','gear','office','training','street']
def xyz(p):return (p[0]-origin['x'],-(p[2]-origin['z']),p[1]-origin['floor'])
def linear(x):return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def mat(color,finish):
    key=(color,finish)
    if key in materials:return materials[key]
    m=bpy.data.materials.new(finish+' '+color);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');rgb=[linear(int(color[i:i+2],16)/255) for i in (1,3,5)]
    p.inputs['Base Color'].default_value=(*rgb,1);m.diffuse_color=(*rgb,1)
    p.inputs['Roughness'].default_value={'metal':.4,'mat':.55,'wood':.52,'glass':.1,'mirror':.04}.get(finish,.85)
    p.inputs['Metallic'].default_value=1 if finish=='mirror' else .6 if finish=='metal' else 0
    if finish=='glass':p.inputs['Transmission Weight'].default_value=.85;p.inputs['IOR'].default_value=1.45
    if finish=='glow':p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=3
    if finish in ('carpet','mat','fabric','wood'):
        n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=190 if finish!='wood' else 70
        b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.18;b.inputs['Distance'].default_value=.006
        m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    materials[key]=m;return m
def append(key,verts,faces):
    vs,fs=buckets.setdefault(key,([],[]));n=len(vs);vs.extend(verts)
    # Primitive rings above are clockwise from outside; reverse the winding
    # before export so GLB consumers receive outward surface normals.
    fs.extend([tuple(n+i for i in reversed(f)) for f in faces])
for part in data['parts']:
    w,h,d=part['size']
    if part['shape']=='box':
        verts=[(x*w/2,y*h/2,z*d/2) for x,y,z in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        faces=[(0,4,6,2),(5,1,3,7),(1,0,2,3),(4,5,7,6),(2,6,7,3),(1,5,4,0)]
    else:
        verts=[(w*math.cos(i*math.tau/12),y*h/2,d*math.sin(i*math.tau/12)) for y in (-1,1) for i in range(12)]
        faces=[tuple(range(11,-1,-1)),tuple(range(12,24))]+[(i,(i+1)%12,(i+1)%12+12,i+12) for i in range(12)]
    # Three's Euler XYZ matrix is Rx Ry Rz (column vectors).
    rx,ry,rz=part['rotation']
    from mathutils import Matrix
    rotation=Matrix.Rotation(rx,3,'X') @ Matrix.Rotation(ry,3,'Y') @ Matrix.Rotation(rz,3,'Z')
    world=[xyz(rotation@Vector(v)+Vector(part['position'])) for v in verts]
    append((part['color'],part['finish']),world,faces)
for key,(vs,fs) in buckets.items():
    mesh=bpy.data.meshes.new(key[1]);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new('Master Kim / '+key[1],mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat(*key))
    # Tiny bevels give the standalone model honest highlights at hard edges.
    if key[1] in ('wood','metal','paint'):
        bevel=o.modifiers.new('Edge highlights','BEVEL');bevel.width=.008;bevel.segments=2
        bevel.limit_method='ANGLE'
image=bpy.data.images.load(str(root/'house-test/master-kim/signs.png'));image.pack()
signmat=bpy.data.materials.new('Code-drawn signs');signmat.use_nodes=True
tex=signmat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
signmat.node_tree.links.new(tex.outputs['Color'],signmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for sign in data['signs']:
    w,h=sign['size'];angle=sign['yaw'];verts=[]
    for x,y in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]:
        local=Vector((x,0,-y)) if sign.get('floor') else Vector((math.cos(angle)*x,y,-math.sin(angle)*x))
        verts.append(xyz(local+Vector(sign['position'])))
    mesh=bpy.data.meshes.new(sign['kind']);mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.update()
    uv=mesh.uv_layers.new();idx=names.index(sign['kind']);x=idx%5;y=idx//5
    for loop,coord in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=((x+.004+coord[0]*.992)/5,1-(y+.004+(1-coord[1])*.992)/4)
    o=bpy.data.objects.new('Sign / '+sign['kind'],mesh);bpy.context.collection.objects.link(o);o.data.materials.append(signmat)
for light in data['lights']:
    l=bpy.data.lights.new(light['name'],'AREA');l.energy=light['power'];l.shape='DISK';l.size=1.5;l.color=(.90,.95,1)
    o=bpy.data.objects.new(light['name'],l);bpy.context.collection.objects.link(o);o.location=xyz(light['position'])
world=bpy.context.scene.world or bpy.data.worlds.new('World');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.65,.75,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
for name,at,target in [('Dojang',(8.9,-15.7,1.7),(5.5,-29,1.7)),('Lounge',(10.6,-5.1,1.6),(10.2,-15,1.6)),('Entry',(8.4,-.9,1.6),(11.8,-2.3,1.2))]:
    c=bpy.data.cameras.new(name);c.lens=22;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=at;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    if name=='Dojang':bpy.context.scene.camera=o
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(dest/'master-kim.blend'))
bpy.ops.export_scene.gltf(filepath=str(dest/'master-kim.glb'),export_format='GLB',export_apply=True,export_cameras=True,export_lights=True)
print('Exported',dest)
