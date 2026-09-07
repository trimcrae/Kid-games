# Pizza portrait — Blender reconstruction test

**Paused at the user's request on September 6, 2026.** The current source,
custom mesh, packed Blender scene, portrait and camera-test video are archived
here. Automatic workflow triggers are disabled; both workflows now require
manual dispatch. Local experiment caches and the extra Blender runtime were
removed to recover disk space.

The photorealistic-quality target remains unmet: the glasses, face silhouette,
hand and food still show reconstruction defects. The archived video is an
unfinished test, not a completed photorealistic result.

This study reconstructs an adult eating pizza from a single photograph.
The Blender camera moves through a modest 24-degree arc over six seconds.
The visible facial and clothing detail comes from a photographic reference;
the underlying subject is a custom volumetric mesh. Side views expose imperfect
inferred geometry, especially around the sunglasses, ear, fingers and food.
This is a camera test, not a faithful 360-degree scan.

## Outputs

- [Camera test, H.264 MP4](output/orbit.mp4)
- [Rendered portrait](output/portrait.png)
- [Packed Blender scene](output/pizza-scene.blend)
- [Left camera extreme](output/left.png) and [right camera extreme](output/right.png)
- [Video metadata](output/video.json)

The scene has a roughly 106,000-face person mesh, image textures, a distant
environment sphere and a small light setup. It uses Blender Cycles on CPU;
no gaming GPU or local machine-learning installation is required to open it.
The MP4 plays independently of Blender. Full rendering is slower than playback.

## Reproduction

Use Blender 4.5 or its `bpy` Python package. The reconstruction is already
provided in `reconstruction/`; rerunning neural inference is unnecessary.

```sh
python inspect_generated.py --asset reconstruction --output /tmp/person --project-photo --views none
python compose.py --person-scene /tmp/person/person-inspection.blend --environment environment.jpg --output output --render
python render_frames.py --scene output/pizza-scene.blend --output frames --part 0 --parts 1
ffmpeg -framerate 24 -start_number 1 -i frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart output/orbit.mp4
```

The GitHub Actions workflows perform reconstruction and final rendering on
remote CPU runners. Local previews used four CPU threads. The final video
contains 144 individually rendered Blender frames at 24 fps and 960×940 pixels.
The portrait is rendered at 1920×1880 pixels.

## Method and limitations

`reconstruct_cpu.py` uses the MIT-licensed TripoSR model with a portable CPU
marching-cubes implementation. `inspect_generated.py` corrects axis and normal
conventions, converts vertex colors, and projects the reference texture onto
visible geometry. `compose.py` creates the plaza environment, lighting and
animated camera. The distant plaza is a generated panorama, so it supplies
angular background motion rather than the parallax of a fully modeled location.

The source photograph is not stored here. `person-reference.jpg` is an
AI-generated isolated interpretation of the photographed adult, clothing,
pose and food. `environment.jpg` is an AI-generated panorama based on the
setting. Unseen surfaces and surrounding architecture are interpretations.
The final still and camera frames are rendered in Blender, not generated video.

The earlier `build.py` experiment uses hand-authored geometry and materials;
its inspected result was too stylized. The user subsequently authorized model
generation while asking that heavy work stay off the ordinary desktop.
`hosted_generate.py` tested Microsoft's hosted TRELLIS.2 demo, but anonymous GPU
quota prevented generation. TripoSR then ran successfully in GitHub Actions.
`relief.py` preserves a further depth-surface experiment; it was rejected for
the video because it flattened and stretched the food.

The older `inspection/` PNGs were produced before axis and color corrections
and are retained as experiment records. Use `output/` for the composed result.
