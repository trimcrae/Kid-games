# Pizza portrait — Blender rendering study

Work in progress toward the requested photorealistic portrait and orbit video.

The initial hand-authored geometry and materials are in `build.py`:
anatomical head, open mouth and teeth, ears, short swept hair and stubble,
browline sunglasses, charcoal Henley shirt, raised hand, loaded pizza,
and a sunny plaza. The uploaded photograph is a visual reference only.
No image-to-3D model, downloaded person, or generated texture is used by that
draft. Its inspected result is too stylized for the requested final quality.

The user subsequently authorized model generation and other techniques, with
the constraint that this is an ordinary desktop without a gaming GPU.
`hosted_generate.py` therefore tests the official Microsoft TRELLIS.2 hosted
demo. Only its lightweight API client runs locally; it does not download or
run neural model weights. Its input is the generated isolated-person reference,
with a closely matched face, clothing, food and pose from the original photo.

The generated asset must pass visual review in Blender before a finished
render or orbit video is claimed. Unseen parts of the person and setting are
interpretations of the single photograph. The hand-authored draft remains
available for comparison and for reusable geometry.

The hosted TRELLIS.2 attempt prepared the reference but was declined by the
service's anonymous GPU quota. No 3D asset was produced by that attempt.
`reconstruct_cpu.py` and the GitHub Actions reconstruction workflow test the
MIT-licensed TripoSR model on a remote CPU runner instead. The resulting GLB
is inspected at four angles with Blender's Cycles renderer by
`inspect_generated.py`. These are experiments, not completed deliverables.
