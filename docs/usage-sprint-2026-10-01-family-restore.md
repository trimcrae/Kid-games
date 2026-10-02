# Family-bundle restore handoff — 2026-10-02

AI-authored implementation with separate independent source/method review and actual GitHub Actions checks.

## Result

Family backups now prepare every incoming profile in memory using the already-reviewed pure valley preparer. Nested malformed state such as `stats: "broken"` and fractional legacy house levels is rejected before persistence. Legacy single-pet backups receive the selected profile's defaults. Preview and restore leave the supplied backup object unchanged.

The actual path is `house-test/save-copy.js`; earlier handoffs supplied an incorrect `games/craepets/` prefix.

Before any live write, a verified append-only journal keeps the exact prior house profile bytes, reset flags and selected profile in `craepets.house.import-recovery.v1`. It permits only the seven real house profile namespaces and house selection/reset keys. Original game profiles, positions, preferences, mail and the older before-import safety record are preserved. Eight distinct snapshots are retained; malformed/full/unwritable journals refuse imports.

An interrupted restore removes changed transaction entries first to free quota, then attempts every prior value and verifies the result. This closes the independently reproduced failure where restoring a large earlier pet first exceeded quota and aborted the rollback of other pets. A still-unavailable store keeps the durable pending record and pauses activity writes. A later boot retries recovery before opening a pet, with an accessible retry button if recovery remains blocked. Delayed real FileReader callbacks recheck the pause before importing. Ambiguous final journal acknowledgments report uncertainty and require reload rather than falsely claiming a rollback.

The existing single-valley validator and normalizer bodies and original game engine remain unchanged. Fresh activity/transfer pages request the coupled save-copy/house-engine scripts with matching revision tokens.

## Exact receipts

- Base main: `9ee843c7bfbf10ffd0c90ecde411b787dbf60ac9`.
- Branch: `codex/usage-sprint-2026-10-01-family-restore`; [PR #4](https://github.com/trimcrae/Kid-games/pull/4).
- Final reviewed/tested source: `628f53660e2b448369219adbdca816a49e7bc721`, tree `8990e576e53c3a54e00a9051e7e4e5f4c9bcf724`.
- Actual PR checkout: `0db69a71d2ee0e6c27b65663061ca492879901ec`; its tree equals the tested source tree.
- [Final actual CI 36952828714](https://github.com/trimcrae/Kid-games/actions/runs/36952828714), job `110669424101`: **SUCCESS, 14/14 suites**, completed `2026-10-02T01:55:13Z`.
- Merged main: `bdb9803d5f318526bab84a826f3f83b59d2a26c1`; its tree equals the reviewed/tested source tree.
- [Pages deployment 36953336359](https://github.com/trimcrae/Kid-games/actions/runs/36953336359): **SUCCESS** on that tested merge.
- [Machine-readable receipt](usage-sprint-2026-10-01/family-restore-validation.json) and original job logs preserve the source/tree bindings and limits.

Actual Node ran **163 production checks** across all seven profiles, including 133 malformed nested-state/profile combinations, detached preparation, preserved progress and namespaces, legacy transfers, target/reset/selection write failures, a UTF-16 size-limited quota simulation, persistent recovery, journal whitelist/capacity refusals, acknowledgment read failures and exact damaged-byte recovery at the transaction boundary.

Actual Chromium passed **Desktop 1280×900, iPad 820×1180 and iPhone 390×844** groups. A minimal same-origin host loads the production family save panel, actual activity iframe and actual transfer page. It exercises real file input/preview/apply, literal display text, all seven profiles, induced DOMException quota failure and retry, a delayed native FileReader, blocked fresh boot/retry, reload and original export isolation. Date is held fixed while real timers/events/storage continue, keeping the unchanged engine's legitimate lastTick updates from invalidating transaction-boundary byte assertions.

The other twelve focused suites passed, including prior importer/Post Office checks, gameplay regression suites and real WebGL validation. This does not establish full 3D walkthrough interaction or physical iOS Safari behavior.

Initial source `a7d520c7f0a6e72290c18c052604ae8a58e4c69e` actually passed 160 Node checks and 13/14 suites in CI 36951955565/job 110666617065; its family browser assertion failed because the running engine legitimately advanced lastTick after reload. This was a repair/test-fixture failure, not a baseline environment failure. Intermediate repaired `d6511b278422c7900e762ad620b827f3f4da52ba` actually passed 163 Node and all three family Chromium groups in job 110668481190; its overall run 36952567474 was automatically cancelled when the final paired-script revision commit advanced the PR.

Independent review reproduced the original malformed-state and quota-order failures, found the delayed-read and automatic-recopy gaps, and checked the final repairs and packaging. Preliminary V8 adapter checks are separate from the actual Node/browser receipts above.

## Limits and next bounded task

Exact prior bytes are restored at the transaction boundary and retained in the append-only bounded journal. The existing loader can still normalize or blank already-damaged state during later ordinary gameplay; that broader loader behavior was not rewritten. The bare save-copy IIFE's damaged-raw recovery test is separate from the real activity browser tests, which use valid prior valleys. Current keys are not promised to remain byte-identical after ordinary gameplay.

Storage calls and tested events are sequential. Cross-tab simultaneous transaction atomicity, physical iOS Safari, recovery-copy export/management UI and arbitrary existing-save recovery remain unverified.

Next priority: separately audit automatic `copyMissing()` profile seeding. It still uses the older minimal pet check, runs before deep engine preparation and may copy malformed original state or replace a damaged house slot. Reproduce one useful case, preserve exact existing house bytes and original namespaces, then make a bounded independently reviewed repair. Do not repeat the completed family restore, valley import or Post Office patches.
