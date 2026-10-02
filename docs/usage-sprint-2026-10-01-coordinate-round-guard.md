# Coordinates round credit handoff

Repeated correct taps during feedback formerly advanced multiple rounds in **Steps & Distance** and **X, Y, Z**. On Easy, four taps on the first correct F3 square could save a perfect 4/4 without answering the other questions.

Walk/F3 now close each accepted question immediately, disable its choices, reject retained choices and detached F3 boards, and cancel feedback transitions when the player leaves or restarts. Wrong answers still give useful feedback and can be corrected. One current question earns one block and at most one first-try point. Historical bests (including inflated legacy values), ranks, completed/perfect builds, free worlds and the save schema remain unchanged.

Only these modes' answer handling and screen cleanup changed, plus the script cache token and two regression registrations. Other game modes, shared workflows and closed save/import/family/house/Post Office work remain unchanged.

## Reviewed source and actual validation

- Baseline main: `846067891bcd8e3e5b0a238cc245ca5d68a500e9`.
- Final source head: `29ccecaf7b3cfba7f5dbc4469f34440dc0d0eefc`; tree `c6c2bc0b877d709024c8f8c8e095a26ff4ac9acb`.
- [PR9](https://github.com/trimcrae/Kid-games/pull/9) merged normally as `68a49928bac7a2d02c38b754d6fff23b74b534c5`, parents baseline + reviewed head, with the identical tested tree.
- [Actual source CI 36993088839](https://github.com/trimcrae/Kid-games/actions/runs/36993088839), job `110793558720`: **SUCCESS**, Node 22.23.3, **20 production Node cases**, **six Chromium groups**, **24/24 focused suites**. Actual checkout `ae02525a00535c009d9713ecd951a4db9654ba4b` has the same reviewed tree.

Node runs unchanged production builders, boards, answer handlers and persistence in an isolated VM. Both normal (650/700 ms) and calm (250 ms) cases cover duplicate grid/choice answers, correction, stale choices and F3 boards, final completion once, Again, and leaving during final feedback before a tier/new-mode change. Re-enabled detached choice callbacks are explicitly synthetic adversarial checks.

The browser suite loads the full production page and solves from public instructions and visible coordinate markers using independent arithmetic and Minecraft-axis knowledge. Desktop/iPad/iPhone normal groups exercise native mouse/touch, Enter/Space, correction, completion, Again and final-feedback abandonment. The three calm groups cover one credit, next-round transition and idle exit; full calm lifecycle coverage is in Node. All groups verify exact synthetic bytes for seven original-game and seven house profiles, selections and unrelated saves, plus retained historical Coordinates progress.

Root and accessibility_scout independently cleared production, test methods, the original final transcript and exact checkout/tree binding. Preliminary baseline V8 adapters are separately labelled; they are not actual Node/browser or real child data. Chromium mobile emulation does not establish physical iOS Safari, simultaneous-tab or storage-durability guarantees.

## Original evidence and test setup correction

See [validation receipt](usage-sprint-2026-10-01/coordinate-round-guard-validation.json), [review receipt](usage-sprint-2026-10-01/coordinate-round-guard-review.json), [baseline/deferred lead](usage-sprint-2026-10-01/coordinate-round-guard-baseline.json) and original [cancelled](usage-sprint-2026-10-01/coordinate-round-guard-ci-initial-cancelled-original.log), [failed](usage-sprint-2026-10-01/coordinate-round-guard-ci-test-failure-original.log) and [successful](usage-sprint-2026-10-01/coordinate-round-guard-ci-final-original.log) logs.

Initial run `36991980640` was automatically **CANCELLED** when the requested coverage-log/test-identity refinement superseded its head; it never reached Coordinates suites. Run `36992167348` actually passed 20 Node cases and 23/24 suites, then the first Desktop browser group failed our expectation that Free Build's live readout would stay “–”. Native hover legitimately read “(8, 3)”. No browser group completed in that failed run. The one-line test fix asserts Free Build's control remains present; production source stayed unchanged. Final CI passed after that test-only correction. Original cancelled, failed and successful transcripts are preserved verbatim with Git blob/SHA256/byte receipts.

[Code Pages 36994186333](https://github.com/trimcrae/Kid-games/actions/runs/36994186333) completed **SUCCESS** on source merge `68a49928bac7a2d02c38b754d6fff23b74b534c5`. The documentation-only main's automatic CI and Pages are reported separately, without another receipt deployment commit.

## Deferred lead and stop

Rock Detective's reported reload-before-Next credit lead is retained only as an independent scout's pinned, synthetic **V8** reproduction in the baseline receipt. It has no Node/browser proof or implementation. Future work requires fresh priorities/owners/fingerprints and an independent exact-trigger reproduction. No second worker or job is queued.

Stop after reviewed documentation integration and observed final Pages publication. Return ownership to the coordinator; completed routes remain closed.
