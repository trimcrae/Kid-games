# Parent world demos

Two original, bounded educational prototypes requested for Cory and Jeannie.
These are **awaiting parent approval**, and must not be added to `GAMES`, the
arcade landing page, Surprise Me, resume suggestions, or service-worker warmup.

Start from the repository root, using the installed Node runtime:

```powershell
node tools/parent-demos/serve.mjs
```

Open http://127.0.0.1:4175/tools/parent-demos/ . The server binds to loopback,
serves only the two demos and their small existing dependencies, and does not
list or expose unrelated repository files. Stop it with Ctrl+C.

The preview guard hides the page and does not load either game outside
localhost/loopback. Therefore merging the source to `main` does not make the
games playable on GitHub Pages. This is a visibility restriction, **not an
authentication system**: source files in the public repository remain public.
Release to the kids requires a later explicit parent instruction.

- **Block & Bloom:** a voxel island for coordinate-based building, garden area,
  and a tower combining volume and material ratios. Mining, placement,
  camera controls, and coordinate controls are part of the prototype.
- **Spellbound Academy:** an original magical-school mystery, using reading
  evidence, word roots, and potion ratios to restore the moon moths.

Both use the existing local MIT-licensed Three.js renderer in
`assets/vendor/three/`; the license remains beside it. World art is procedural,
and no franchise artwork, new package install, external service, or account is
needed. Saves are separate localStorage keys, and each demo has its own reset.

Standing machine restriction: do not run browsers, browser tests, screenshots,
or UI automation from 06:00 inclusive to 10:00 exclusive America/New_York.
Check current local time before those operations. Code-only work is permitted.

## Verification

Pure Node checks (no browser required):

```powershell
node tests/parent-demo-isolation.mjs
node tests/parent-demo-learning.mjs
```

Reviewed in the local browser on 2026-09-26, including desktop and 390px layouts:

- Both complete learning paths and endings; wrong-answer/build feedback.
- Block placement through coordinates and the 3D view, mining, support rules,
  keyboard selection, the 64-cell map, camera dragging, and reset cancellation.
- Academy prerequisites, evidence, spell meaning, incorrect 3:3 potion mixture,
  correct 4:2 mixture, incorrect/correct brewing sequence, and 3D station taps.
- Partial and completed saved progress across reloads; resetting each demo.
- No browser errors or warnings observed in either game.

The tests check that neither demo is referenced by arcade discovery or offline
warmup, nonlocal hosts fail the preview guard, pages start hidden, and the local
server only exposes its allowlisted files. The preview hub intentionally remains
the local-only entry point; this review does not approve release to the kids.
