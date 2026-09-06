"""Render and inspect the reconstructed person in native Blender/Cycles.

blender -b -t 4 --python models/pizza-study/render.py -- --asset DIR --output DIR
"""
import argparse
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else sys.argv[1:]
p = argparse.ArgumentParser()
p.add_argument('--asset', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--samples', type=int, default=32)
p.add_argument('--size', type=int, default=800)
p.add_argument('--project-photo', action='store_true')
p.add_argument('--views', default='front,left,right,side')
args = p.parse_args(argv)
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
    links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(attr.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = .7
    if args.project_photo:
        uv = obj.data.uv_layers.new(name='Reference camera projection')
        for poly in obj.data.polygons:
            for li in poly.loop_indices:
                v = obj.matrix_world @ obj.data.vertices[obj.data.loops[li].vertex_index].co
                span = 2 * max(.01, 1.9-v.x) * math.tan(math.radians(20))
                uv.data[li].uv = (.5+v.y/span, .5+v.z/span)
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(str(args.asset / 'input.png'))
        tex.extension = 'EXTEND'
        links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
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
for name in args.views.split(','):
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
