"""Render and inspect the reconstructed person in native Blender/Cycles.

blender -b -t 4 --python models/pizza-study/render.py -- --asset DIR --output DIR
"""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
import bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
p = argparse.ArgumentParser()
p.add_argument('--asset', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--samples', type=int, default=32)
p.add_argument('--size', type=int, default=800)
p.add_argument('--project-photo', action='store_true')
p.add_argument('--views', default='front,left,right,side')
args = p.parse_args(argv)
args.asset=args.asset.resolve()
args.output=args.output.resolve()
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.render.resolution_x = args.size
scene.render.resolution_y = args.size
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('Soft daylight fill')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.7,.77,.86,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .45
scene.render.film_transparent = True

bpy.ops.import_scene.gltf(filepath=str(args.asset / 'person.glb'))
person_objects = [o for o in scene.objects if o.type == 'MESH']
for obj in person_objects:
    # TripoSR's trimesh export contains Z-up coordinates in a glTF container.
    # Undo glTF import's Y-up conversion before placing Blender cameras.
    obj.matrix_world=Matrix.Rotation(-math.pi/2,4,'X') @ obj.matrix_world
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    if bm.calc_volume(signed=True)<0:
        bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    obj.name = 'Custom person eating pizza'
    for poly in obj.data.polygons:
        poly.use_smooth = True
    mat = bpy.data.materials.new('Photographic color and soft surface response')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = .65
    bsdf.inputs['Specular IOR Level'].default_value = .15
    attr = nodes.new('ShaderNodeVertexColor')
    attr.layer_name = obj.data.color_attributes[0].name
    for datum in obj.data.color_attributes[0].data:
        r,g,b,a=datum.color
        datum.color=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in (r,g,b))+(a,)
    links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(attr.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = .7
    if args.project_photo:
        uv = obj.data.uv_layers.new(name='Reference camera projection')
        confidence = obj.data.color_attributes.new(name='Reference visibility',type='FLOAT_COLOR',domain='POINT')
        world_vertices=[obj.matrix_world @ v.co for v in obj.data.vertices]
        tree=BVHTree.FromPolygons(world_vertices,[tuple(p.vertices) for p in obj.data.polygons])
        normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
        camera_origin=Vector((1.9,0,0))
        for i,v in enumerate(obj.data.vertices):
            world=world_vertices[i]
            ray=world-camera_origin
            hit=tree.ray_cast(camera_origin,ray.normalized(),ray.length+.01)
            visible=hit[0] is not None and abs(hit[3]-ray.length)<.005
            facing=max(0,(normal_matrix @ v.normal).normalized().dot(-ray.normalized()))
            weight=min(1,max(0,facing/.07)) if visible else 0
            confidence.data[i].color=(weight,weight,weight,1)
        for poly in obj.data.polygons:
            for li in poly.loop_indices:
                v = obj.matrix_world @ obj.data.vertices[obj.data.loops[li].vertex_index].co
                span = 2 * max(.01, 1.9-v.x) * math.tan(math.radians(20))
                uv.data[li].uv = (.5+v.y/span, .5+v.z/span)
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(args.asset / 'input.png'))
        tex.extension = 'EXTEND'
        vis=nodes.new('ShaderNodeVertexColor');vis.layer_name=confidence.name
        mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX'
        links.new(vis.outputs['Color'],mix.inputs[0])
        links.new(attr.outputs['Color'],mix.inputs[1])
        links.new(tex.outputs['Color'],mix.inputs[2])
        links.new(mix.outputs[0], bsdf.inputs['Base Color'])
        links.new(mix.outputs[0], bsdf.inputs['Emission Color'])
        # Match the reconstruction's exact padded alpha silhouette. This trims
        # gray background slivers where the inferred mesh exceeds the reference.
        cut=bpy.data.images.load(str(args.asset / 'cutout.png'))
        pixels=np.asarray(cut.pixels[:],dtype=np.float32).reshape(cut.size[1],cut.size[0],4)[::-1]
        yy,xx=np.where(pixels[:,:,3]>0)
        fg=pixels[yy.min():yy.max(),xx.min():xx.max()]
        side=max(fg.shape[:2]); padded=int(side/.85)
        alpha=np.zeros((padded,padded,4),dtype=np.float32)
        y=(side-fg.shape[0])//2+(padded-side)//2
        x=(side-fg.shape[1])//2+(padded-side)//2
        alpha[y:y+fg.shape[0],x:x+fg.shape[1]]=fg
        mask=bpy.data.images.new('Padded reference silhouette',width=padded,height=padded,alpha=True)
        mask.pixels.foreach_set(alpha[::-1].ravel());mask.pack()
        masktex=nodes.new('ShaderNodeTexImage');masktex.image=mask;masktex.extension='CLIP'
        links.new(masktex.outputs['Alpha'],bsdf.inputs['Alpha'])
    links.new(bsdf.outputs['BSDF'],out.inputs['Surface'])
    obj.data.materials.clear()
    obj.data.materials.append(mat)

def area(name, location, power, size):
    data = bpy.data.lights.new(name,'AREA')
    data.energy = power
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Large daylight source',(3,-3,5),130,4)
camdata = bpy.data.cameras.new('Inspection camera')
cam = bpy.data.objects.new('Inspection camera',camdata)
scene.collection.objects.link(cam)
scene.camera = cam
camdata.type = 'PERSP'
camdata.lens = 49.46
camdata.sensor_width = 36
angles = {'front':0,'left':-30,'right':30,'side':90,'back':180}
for name in ([] if args.views=='none' else args.views.split(',')):
    angle = math.radians(angles[name])
    cam.location = (1.9*math.cos(angle),1.9*math.sin(angle),0)
    cam.rotation_euler = (-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath = str(args.output / (name+'.png'))
    print('Rendering',name,flush=True)
    bpy.ops.render.render(write_still=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(args.output/'person-inspection.blend'),compress=True)
(args.output/'inspection.json').write_text(json.dumps({
    'blender':bpy.app.version_string,'engine':scene.render.engine,
    'meshes':len(person_objects),
    'polygons':sum(len(o.data.polygons) for o in person_objects),
    'views':args.views.split(','),'photo_projected':args.project_photo,
    'samples':args.samples,'resolution':args.size},indent=2)+'\n')
