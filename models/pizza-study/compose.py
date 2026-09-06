"""Compose the textured 3D person and reconstructed plaza in Blender.

The subject is a volumetric mesh. The distant set is an environment panorama.
Render frames with Blender; this script never generates video outside Blender.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

p=argparse.ArgumentParser()
p.add_argument('--person-scene',type=Path,required=True)
p.add_argument('--environment',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--preview',action='store_true')
p.add_argument('--render',action='store_true')
p.add_argument('--frame',type=int,default=1)
p.add_argument('--samples',type=int,default=64)
args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:])
args.output=args.output.resolve();args.output.mkdir(parents=True,exist_ok=True)
env_path=args.environment.resolve()
bpy.ops.wm.open_mainfile(filepath=str(args.person_scene.resolve()))
scene=bpy.context.scene
for o in list(scene.objects):
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
person=next(o for o in scene.objects if o.type=='MESH')
person.name='Custom textured person eating pizza'

# A spherical distant-environment plate remains consistent during an orbit.
# It is visible to camera/glossy rays; separate lights control the foreground.
bpy.ops.mesh.primitive_uv_sphere_add(segments=128,ring_count=64,radius=18,location=(0,0,.3))
dome=bpy.context.object;dome.name='Reconstructed plaza environment sphere'
for f in dome.data.polygons:f.use_smooth=True
mat=bpy.data.materials.new('Plaza photographic environment');mat.use_nodes=True
n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear()
out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission')
env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(env_path))
geom=n.new('ShaderNodeNewGeometry')
subtract=n.new('ShaderNodeVectorMath');subtract.operation='SUBTRACT';subtract.inputs[1].default_value=(0,0,.3)
rotate=n.new('ShaderNodeVectorRotate');rotate.rotation_type='AXIS_ANGLE';rotate.inputs['Axis'].default_value=(0,0,1)
rotate.inputs['Angle'].default_value=math.radians(180)
l.new(geom.outputs['Position'],subtract.inputs[0]);l.new(subtract.outputs[0],rotate.inputs['Vector']);l.new(rotate.outputs[0],env.inputs[0])
l.new(env.outputs['Color'],em.inputs[0])
path=n.new('ShaderNodeLightPath');maximum=n.new('ShaderNodeMath');maximum.operation='MAXIMUM'
l.new(path.outputs['Is Camera Ray'],maximum.inputs[0]);l.new(path.outputs['Is Glossy Ray'],maximum.inputs[1])
transparent=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader')
l.new(maximum.outputs[0],mix.inputs[0]);l.new(transparent.outputs[0],mix.inputs[1]);l.new(em.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs[0])
dome.data.materials.append(mat)

world=bpy.data.worlds.new('Outdoor ambient fill');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.74,.88,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.24;scene.world=world
ld=bpy.data.lights.new('Broad reflected daylight','AREA');ld.energy=70;ld.shape='DISK';ld.size=3
light=bpy.data.objects.new('Broad reflected daylight',ld);scene.collection.objects.link(light)
light.location=(3,-2,4);light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
focus=bpy.data.objects.new('Focus at face and food',None);scene.collection.objects.link(focus);focus.location=(.08,.15,.26)
cd=bpy.data.cameras.new('Portrait orbit camera');cam=bpy.data.objects.new('Portrait orbit camera',cd);scene.collection.objects.link(cam);scene.camera=cam
cd.lens=98;cd.sensor_width=36;cd.shift_x=.19;cd.shift_y=.32
cd.dof.use_dof=True;cd.dof.focus_object=focus;cd.dof.aperture_fstop=8;cd.dof.aperture_blades=9
for frame,angle,z in [(1,0,0),(37,-12,.01),(91,12,-.01),(144,0,0)]:
    a=math.radians(angle);cam.location=(1.9*math.cos(a),1.9*math.sin(a),z)
    cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
scene.frame_start=1;scene.frame_end=144;scene.render.fps=24;scene.frame_set(args.frame)
scene.render.film_transparent=False
scene.render.resolution_x=800 if args.preview else 1920
scene.render.resolution_y=784 if args.preview else 1880
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24 if args.preview else args.samples
scene.cycles.use_denoising=True;scene.cycles.max_bounces=6
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0
scene['method']='Blender Cycles; TripoSR custom 3D subject; visibility-aware photographic texture projection; generated spherical plaza environment.'
scene['limitations']='Single-photo reconstruction. Hidden surfaces are inferred. The background is a panorama, not a surveyed plaza mesh.'
scene['status']='Composition preview awaiting visual review.'
scene['compose_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/'pizza-scene.blend'),compress=True)
(args.output/'scene.json').write_text(json.dumps({'method':scene['method'],'limitations':scene['limitations'],
    'status':scene['status'],'blender':bpy.app.version_string,'frames':144,'fps':24,
    'camera_degrees':[-12,12],'subject_polygons':len(person.data.polygons),
    'compose_sha256':scene['compose_sha256']},indent=2)+'\n')
if args.render or args.preview:
    scene.render.filepath=str(args.output/('preview-%03d.png'%args.frame if args.preview else 'portrait.png'))
    bpy.ops.render.render(write_still=True)
