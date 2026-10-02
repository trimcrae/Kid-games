# Post Office save recovery handoff — 2026-10-02

AI-authored implementation with separate independent source review and actual GitHub Actions validation.

## Result

The Post Office now recovers usable letters and all six family members' drafts in memory from mixed damaged mailbags. Null letters, malformed bodies/recipients and inherited object names no longer crash startup or writing. Valid text is retained, native family IDs are fenced, and the older Dad ID migrates to Tristan.

Before the first repaired write, exact original bytes are kept locally in `post-office.recovery.v1`. Copies are append-only, deduplicated and limited to eight distinct snapshots. A full or malformed recovery store, or a failed safety-copy write, refuses the mailbag overwrite and displays a save warning. Reading does not modify storage. Recovery contents stay on this device.

Real other-tab refreshes rebind an open reader to its current letter. Read and trash actions persist without losing incoming mail. Removed readers and profile switches cancel delayed opening callbacks. A sender's Sent preview cannot mark a recipient's letter opened. A failed posting write leaves the message and recipients available for retry.

## Provenance and validation

- Base main: `9bf9b61f8f1a89493e919a76f57df086bd6bd916`.
- Branch: `codex/usage-sprint-2026-10-01-post-office-recovery`.
- [PR #3](https://github.com/trimcrae/Kid-games/pull/3).
- Initial source: `dfde14901cc44849000c79937a874a0970921f4e`; its actual CI passed 12/12 suites.
- Final reviewed source: `9c377a2fc6d5d5f81bc5da3432418bb9e005d328`.
- Final synthetic PR checkout: `5c801072cd17ea7948be04b9a6fa092db7d687a0`; checkout and reviewed source trees are identical: `8805937f2e08312a0c6cce2921964489c4136db3`.
- Actual final CI: [run 36947199408](https://github.com/trimcrae/Kid-games/actions/runs/36947199408), job `110651904041`. **SUCCESS, 12/12 suites**, completed 2026-10-02T00:44:56Z.
- Merged into main as `f400476238f786733291fca80ca6568447721704`; merge tree equals the reviewed/tested source tree.
- [Pages deployment 36947678263](https://github.com/trimcrae/Kid-games/actions/runs/36947678263) completed **SUCCESS** at merged `f400476238f786733291fca80ca6568447721704`.

The final Node suite passes 56 production storage checks, including every family draft, legacy IDs, malformed rows, unusable snapshots, normal saves, preserved raw copies and failed storage writes. The real Chromium suite passes Desktop 1280×900, iPad 820×1180 and iPhone 390×844 groups. It uses real second-tab storage events and covers damaged saves, active draft preservation, rebound read/delete, removed-reader and keyboard profile-switch cancellation, sender preview, quota retry, delivery/reload, literal text, layout and unrelated Craepets game/house save keys. The other ten focused regression suites also pass.

Independent review additionally executed the full production IIFE against the original stale-reader, delayed-switch and sender-preview reproductions using isolated V8 DOM/storage adapters. Those preliminary JS checks are distinct from the actual Node/browser CI above. Review found and closed the two reader ownership gaps before integration.

## Limits and next bounded task

Chromium emulates mobile dimensions/touch; real iOS Safari was not tested. Tests exercise sequential real storage events, not atomic simultaneous writes across tabs. A damaged recovery store or eight distinct safety copies intentionally blocks additional repair writes without deleting earlier copies; recovery/export UI is not part of this repair.

The completed Craepets single-valley importers and house bridge are untouched. Next priority: independently audit `games/craepets/house-test/save-copy.js` family-bundle restoration for malformed nested state and partial storage failures across all real profile namespaces. Check current main, open PRs and sprint branches before selecting it. Preserve all progress and keep any follow-up separate.
