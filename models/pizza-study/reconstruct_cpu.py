"""Local TripoSR reconstruction, with a portable CPU marching-cubes backend.

The upstream source and MIT-licensed weights are supplied as CLI arguments.
No photograph is uploaded by this script. Run in an isolated Python environment.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import time
import types

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
parser.add_argument('--weights', type=Path, required=True)
parser.add_argument('--image', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--resolution', type=int, default=256)
parser.add_argument('--threads', type=int, default=4)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
os.environ['OMP_NUM_THREADS'] = str(args.threads)
os.environ['MKL_NUM_THREADS'] = str(args.threads)

import numpy as np
import torch
from PIL import Image
from skimage.measure import marching_cubes

torch.set_num_threads(args.threads)
# Upstream expects the CUDA extension's (z,y,x) coordinate convention.
# scikit-image computes the same isosurface on CPU, without a C++/CUDA build.
adapter = types.ModuleType('torchmcubes')
def cpu_marching_cubes(field, threshold):
    vertices, faces, _, _ = marching_cubes(field.cpu().numpy(), threshold)
    return (torch.from_numpy(vertices[:, [2, 1, 0]].copy()),
            torch.from_numpy(faces.astype(np.int64).copy()))
adapter.marching_cubes = cpu_marching_cubes
sys.modules['torchmcubes'] = adapter
sys.path.insert(0, str(args.source.resolve()))
from tsr.system import TSR
from tsr.utils import resize_foreground
import rembg

def log(message):
    print(time.strftime('%H:%M:%S'), message, flush=True)

prepared = args.output / 'input.png'
if not prepared.exists():
    log('Removing background from the generated reconstruction reference')
    cutout = rembg.remove(Image.open(args.image), session=rembg.new_session('u2net'))
    cutout.save(args.output / 'cutout.png')
    rgba = np.asarray(resize_foreground(cutout, .85)).astype(np.float32) / 255
    rgb = rgba[:, :, :3] * rgba[:, :, 3:] + .5 * (1 - rgba[:, :, 3:])
    Image.fromarray((rgb * 255).astype(np.uint8)).save(prepared)

log('Loading TripoSR on CPU')
model = TSR.from_pretrained(str(args.weights), config_name='config.yaml', weight_name='model.ckpt')
model.eval()
model.renderer.set_chunk_size(16384)
codes_path = args.output / 'scene_codes.pt'
if codes_path.exists():
    log('Restoring previously computed scene representation')
    codes = torch.load(codes_path, map_location='cpu', weights_only=True)
else:
    log('Inferring the custom person volume')
    with torch.inference_mode():
        codes = model([Image.open(prepared)], device='cpu')
    torch.save(codes, codes_path)
    log('Saved scene representation')
log(f'Extracting {args.resolution} cubed isosurface')
with torch.inference_mode():
    mesh = model.extract_mesh(codes, True, resolution=args.resolution)[0]
mesh.export(args.output / 'person.glb')
mesh.export(args.output / 'person.ply')
report = {'method': 'TripoSR with scikit-image CPU marching cubes',
          'resolution': args.resolution, 'vertices': len(mesh.vertices),
          'faces': len(mesh.faces), 'bounds': mesh.bounds.tolist(),
          'watertight': bool(mesh.is_watertight),
          'input': args.image.name,
          'limitation': 'Single-view inferred geometry; hidden surfaces are estimates.'}
(args.output / 'reconstruction.json').write_text(json.dumps(report, indent=2)+'\n')
log('Saved person.glb, person.ply and reconstruction.json')
