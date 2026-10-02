# Life Lab prediction credit sprint handoff

AI-assisted bounded gameplay repair in trimcrae/Kid-games. Completed importers, Post Office, family restore, seeding and Craepets loaders remain closed.

## Result and scoring boundary

Life Lab formerly increased prediction streak on every repeated correct check of one board. Three checks could award Fortune Teller without three learning rounds. The cell edit callback also cleared the Show status, so Show → toggle one square twice → Check could earn credit.

Each **New puzzle** now opens one credit opportunity. Earned and revealed flags last until the next New puzzle, even after edits or **Start over**. A correct unpeeked puzzle earns once; rechecks and solved-round edits/wrong answers/reset are practice and retain earned streak/best without another answer/badge/win/confetti reward. Wrong feedback and correction before the first success remain useful and can earn one credit. Different rounds may legitimately have identical boards.

**Show me** retains its existing explicit streak reset, including after a successful answer. It never restores same-round eligibility. Existing saved bests and badges remain, including historical badges: this change does not revoke progress. Existing save scheduling still occurs on repeated checks.

Only the prediction controls changed in production code. The rule core and complete save/load/boot suffix, including the saved schema, are byte-identical to the baseline. The HTML changes its game-script query token for publication. No Craepets, house, Post Office or recovery code changes.

## Exact source and actual checks

- Baseline main: 124c9cf34b2e40c40e255861e5916a4c0cbed856.
- Initial source: 01e5bf728eca7c9117864d11639f8e2b6edc067c.
- Final reviewed/tested source: 8d2fc33b0d89fa27fa3aead7e46d5199af0ad28e, branch codex/usage-sprint-2026-10-01-life-prediction-credit.
- Reviewed tree: 931210a37c9bbb14c9939bfb58699572d105413e.
- [PR8](https://github.com/trimcrae/Kid-games/pull/8) merged normally as 1141420a00e3e83e19eefa237a9dee09097bda31; parents preserve baseline main and reviewed source, with the same tested tree.

[Actual final CI 36980400766](https://github.com/trimcrae/Kid-games/actions/runs/36980400766), job 110753544789, completed **SUCCESS**: Node 22.23.3, **27 production-control cases**, all three full production-page Chromium **Desktop/iPad/iPhone** groups, and **22/22** focused suites. Synthetic checkout 05c5f570844251bffe1c03a4ae8e2af7902e4c19 has the identical reviewed tree. No manual duplicate CI job was dispatched.

The Node suite executes actual production prediction controls, native callback bodies, badge reward code and rule core with isolated DOM/reward adapters. Its independent coordinate tally covers stable block, edge-reaching blinker, finite separated corners and corner L; a wrapped-corners control distinguishes the finite boundary. Tests cover repeated checks, solved-round practice, Show/edit/reset, legitimate correction, new-round credits and preserved historical best/badge.

Browser checks load the full production Life Lab page. They solve from the original “alive now/empty now” coordinate labels with a separate finite B3/S23 tally, without a production answer hook. Native Enter earns the first credit; repeated Enter/Space/checks and mobile taps exercise the real controls. Blinker/block positives, Rule Lab/world-wrap independence, three new rounds, reveal/practice boundaries, real saved-progress reloads and historical progress are checked. Synthetic exact bytes in all seven original-game and seven house profile slots, selections and unrelated saves remain unchanged.

Root and Apps independently cleared source, method, actual CI and checkout-tree bindings. Rare’s completed preliminary four-fixture V8 methods review informed the oracle; its final checkpoint review was unavailable due model capacity and is not claimed as a final gate.

## Original receipts and initial setup failure

See [validation receipt](usage-sprint-2026-10-01/life-prediction-validation.json), [review receipt](usage-sprint-2026-10-01/life-prediction-review.json), [baseline evidence](usage-sprint-2026-10-01/life-prediction-baseline.json), [original final transcript](usage-sprint-2026-10-01/life-prediction-ci-final-original.log) and [original initial transcript](usage-sprint-2026-10-01/life-prediction-ci-initial-original.log).

Final log: 146,592 UTF-8 bytes, Git blob 2cdc162367367d66f70424186c4cf655e0862fbf, SHA256 b74ea2d4d0430e03cc28cf3608db83d305615728b889316f6d3bd715699113c2. Initial log: 142,418 UTF-8 bytes, Git blob  e81e4fb3879c410f883ef41da1fb57202c81630e, SHA256 c9d372289f0dae5358b76585208567de6002fc2064afc1d7b1b811baff4aa596.

Initial CI 36980133994, job 110752547757, is **CANCELLED overall**. It actually passed 27 Node cases, then the browser suite failed during the Desktop historical fixture: expected best19/streak2, observed best3/streak3. Editing fixture bytes on an active game and reloading allowed its normal pagehide save to overwrite the fixture. This was our test setup failure, not a baseline environment failure. It did not complete a device group or full-suite result. The test-only repair stages initial/historical fixture writes on a neutral same-origin page; genuine game-progress reload checks remain.

Baseline witnesses are preliminary actual-source V8 adapters, not Node/browser or real child data. The coordinator’s four-cell checkPuzzle stub does not count the additional badge reward effects; Apps’ native 6×6 controls include that real badge award. Final actual tests distinguish those scopes.

[Code Pages 36981846450](https://github.com/trimcrae/Kid-games/actions/runs/36981846450) completed **SUCCESS** on the tested source merge 1141420a00e3e83e19eefa237a9dee09097bda31. The later docs-only head’s deployment is reported separately, without another receipt commit.

## Limits and stop

All data are synthetic. Browser evidence uses full production-page Chromium with Desktop and iPad/iPhone emulation; physical iOS Safari remains unverified. This bounded scoring repair does not establish simultaneous-tab/storage-durability guarantees, add assets or change recovery management.

No additional independently demonstrated defect or new task is queued. Stop after reviewed handoff integration and observed final Pages publication; return ownership to the coordinator. Re-read fresh priorities/owners before separate future work.
