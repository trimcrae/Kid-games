"""Test a photo-aligned relief surface using depths from the inferred mesh.

This is a limited-view reconstruction, not a complete person scan.
"""
import argparse, math
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

p=argparse.ArgumentParser();p.add_argument('--scene',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
import sys
args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
verts=[obj.matrix_world@v.co for v in obj.data.vertices]
tree=BVHTree.FromPolygons(verts,[tuple(f.vertices) for f in obj.data.polygons])
mask=bpy.data.images['Padded reference silhouette']
rgba=np.asarray(mask.pixels[:]).reshape(mask.size[1],mask.size[0],4)
N=280
uvs=np.linspace(.055,.945,N)
depth=np.full((N,N),np.nan);inside=np.zeros((N,N),dtype=bool)
origin=Vector((1.9,0,0));tan=math.tan(math.radians(20))
for j,v in enumerate(uvs):
    for i,u in enumerate(uvs):
        inside[j,i]=rgba[int(v*(mask.size[1]-1)),int(u*(mask.size[0]-1)),3]>.45
        if not inside[j,i]:continue
        ray=Vector((-1,2*tan*(u-.5),2*tan*(v-.5))).normalized()
        hit=tree.ray_cast(origin,ray,4)
        if hit[0] is not None:depth[j,i]=hit[0].x
# Fill thin silhouette regions and remove reconstruction spikes in camera depth.
for _ in range(35):
    stacked=np.stack([np.roll(depth,k,axis=a) for a in [0,1] for k in [-1,1]])
    good=np.isfinite(stacked);num=good.sum(axis=0)
    average=np.nansum(stacked,axis=0)/np.maximum(1,num)
    missing=inside & ~np.isfinite(depth) & (num>0)
    depth[missing]=average[missing]
depth=np.nan_to_num(depth,nan=0)
for _ in range(4):
    total=depth.copy();counts=np.ones_like(depth)
    for a in [0,1]:
        for k in [-1,1]:
            valid=np.roll(inside,k,axis=a)
            total+=np.roll(depth,k,axis=a)*valid;counts+=valid
    depth=np.where(inside,total/counts,depth)
coords=[];uv=[];indices={}
for j,v in enumerate(uvs):
    for i,u in enumerate(uvs):
        if inside[j,i]:
            x=depth[j,i];span=2*(1.9-x)*tan
            indices[j,i]=len(coords);coords.append((x,(u-.5)*span,(v-.5)*span));uv.append((u,v))
faces=[]
for j in range(N-1):
    for i in range(N-1):
        quad=[(j,i),(j,i+1),(j+1,i+1),(j+1,i)]
        if all(p in indices for p in quad):faces.append(tuple(indices[p] for p in quad))
mesh=bpy.data.meshes.new('Depth sampled photographic surface');mesh.from_pydata(coords,[],faces);mesh.update()
surface=bpy.data.objects.new('Photo aligned depth relief',mesh);bpy.context.scene.collection.objects.link(surface)
layer=mesh.uv_layers.new(name='Reference UV')
for loop in mesh.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
for f in mesh.polygons:f.use_smooth=True
mat=bpy.data.materials.new('Photographic relief');mat.use_nodes=True
n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear()
t=n.new('ShaderNodeTexImage');t.image=next(im for im in bpy.data.images if Path(im.filepath).name=='input.png')
shader=n.new('ShaderNodeEmission');shader.inputs[1].default_value=1
out=n.new('ShaderNodeOutputMaterial');l.new(t.outputs['Color'],shader.inputs[0]);l.new(shader.outputs[0],out.inputs[0]);mesh.materials.append(mat)
bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.file.pack_all();args.output.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(args.output.resolve()),compress=True)
