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

- **Block Lab:** a voxel island for coordinate-based building, garden area,
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
