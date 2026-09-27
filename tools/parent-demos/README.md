# Parent world demos

Two original, bounded educational prototypes requested for Cory and Jeannie.
These are **awaiting approval for the kids' arcade**, and must not be added to `GAMES`, the
arcade landing page, Surprise Me, resume suggestions, or service-worker warmup.

The parent approved online access by direct link on 2026-09-27:
https://trimcrae.github.io/Kid-games/tools/parent-demos/
Both demos and the hub request `noindex,nofollow`. They are unlisted, not
password-protected: anyone with the link can open them.

Start from the repository root, using the installed Node runtime:

```powershell
node tools/parent-demos/serve.mjs
```

Open http://127.0.0.1:4175/tools/parent-demos/ . The server binds to loopback,
serves only the two demos and their small existing dependencies, and does not
list or expose unrelated repository files. Stop it with Ctrl+C.

The preview guard supports the HTTPS GitHub Pages host and localhost/loopback.
Adding the demos to the kids' arcade still requires a later explicit parent
instruction. The arcade will not automatically download these demos for offline
use; its service worker may cache them after someone opens a direct link.

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
warmup, the approved online host and local preview work, unrelated hosts fail the
preview guard, all three pages request no indexing, and the local server only
exposes its allowlisted files. Online preview access does not approve adding the
demos to the kids' arcade.
