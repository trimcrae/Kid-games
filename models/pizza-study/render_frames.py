"""Render a deterministic segment of the Blender orbit on a CPU worker."""
import argparse
import json
from pathlib import Path
import bpy

p=argparse.ArgumentParser()
p.add_argument('--scene',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--part',type=int,required=True)
p.add_argument('--parts',type=int,default=8)
args=p.parse_args()
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
scene=bpy.context.scene
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=960;scene.render.resolution_y=940
scene.cycles.samples=20
args.output.mkdir(parents=True,exist_ok=True)
frames=list(range(scene.frame_start+args.part,scene.frame_end+1,args.parts))
for frame in frames:
    scene.frame_set(frame)
    scene.render.filepath=str((args.output/('%04d.png'%frame)).resolve())
    bpy.ops.render.render(write_still=True)
(args.output/('part-%d.json'%args.part)).write_text(json.dumps({'frames':frames,'samples':20,'size':[960,940]}))
