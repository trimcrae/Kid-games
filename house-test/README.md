# House walkthrough test

Standalone test URL: https://trimcrae.github.io/Kid-games/house-test/

This page is intentionally absent from the arcade registry and home page. It
includes `noindex,nofollow,noarchive`; that is a search-engine request, not
authentication. GitHub Pages and this repository remain public.

Use WASD or arrow keys to walk, mouse/drag to look, Shift to move faster and
Escape to pause. Touch devices have a movement pad and drag-to-look. The Rooms
menu jumps to a starting point on each floor or in either yard. Doors and the
upper stair gate are held open in the browser export. There is no analytics,
account, network service, or runtime CDN dependency.

The geometry comes from `models/house/house.blend`. The photo-derived furniture
and layout are retained. Procedural Blender textures and small bevels are
omitted for browser performance. Reflections and lighting are simplified.
The source photographs, people, personal pictures, street addresses and
neighbouring homes are not included. Yard limits and unseen dimensions remain
estimates. The master bathroom's attachment is awaiting the homeowner's
orientation clarification; do not treat its current placement as confirmed.

## Rebuild

Run with a Python that has Blender's `bpy` module:

```sh
python models/house/build.py
python models/house/export_walkthrough.py
node models/house/test_walkthrough.mjs
python -m http.server 8765
```

Visit `http://localhost:8765/house-test/`. The exporter produces a gzip-compressed
interleaved position/normal buffer, material groups and spatial collision boxes.
It never edits the source Blender file. Walking uses a spatial grid, wall
sliding and small movement steps; the floor height follows stair treads. This
is a house review simulator, not a general-purpose physics engine.

The vendored rendering library is [Three.js r180](https://github.com/mrdoob/three.js/tree/r180),
under its included MIT license in `vendor/THREE-LICENSE.txt`.
