# Usage sprint handoff — 2026-10-01

The original Craepets game now prepares backup imports in memory before replacing a child's saved valley. Invalid state shapes and storage quota failures preserve the current pet and active lesson. Older backups receive finite pet needs and egg defaults. Imported lesson, harvest and diary display strings are escaped, and harvest cells cannot enlarge the phone layout.

- Change: [PR #1](https://github.com/trimcrae/Kid-games/pull/1), merged into main as `d63303c27ab0deb54b45d27128f2e0f8927a9da7`.
- Tested source and test revision: `4799c830c7e7fca2afda3064c4ec134a569e86d3`.
- JavaScript import runtime independently reviewed at `f82e22cde1a55f7b5ec31ba9501e315bc0cac878`; the final harvest CSS and viewport assertions independently reviewed at `4799c830c7e7fca2afda3064c4ec134a569e86d3`.
- [Actual focused CI](https://github.com/trimcrae/Kid-games/actions/runs/36938056203), job `110622862778`, passed **10/10 suites**.

The new Node transaction suite passed 53 malformed backup cases, a failed storage write, full and legacy transfers, fresh loads, legacy egg/house migration, and 75 genuine generated review questions across all five tiers, three subjects and five difficulty rungs. Independent review separately checked 375 generated questions against the import validator.

The real Chromium suite passed at desktop 1280×900 and phone 390×844, covering rejected imports during an active lesson, quota failure, transferred-pet play, reload, preservation of a sibling's save, escaped markup/attribute strings, and the configured viewport width. The other eight existing focused suites passed, including real WebGL model checks.

Earlier isolated V8 execution used actual Craepets data/pet tables and in-memory storage, with adapters for Node's fs/vm/assert interfaces. That preliminary execution was not browser validation. The linked CI run supplies the actual Node and browser evidence. No local Node or browser runtime was available in the API session. Chromium mobile emulation does not establish real iOS Safari behavior.

## House activity importer — completed

The explicit `house-test/engine.js` fork now uses the same reviewed single-valley import preparation as the original game. Standalone imports target `craepets.house.v1.<profile>`; opened from the game, imports target the shared `craepets.v1.<profile>`. Invalid backups and quota failures preserve the active child, saved bytes and lesson. Imported display strings are escaped and harvest cells stay bounded. The actual house bridge, rest activity and custom render layout were byte-preserved; the clone generator was not run.

- [PR #2](https://github.com/trimcrae/Kid-games/pull/2), merged as `d633aaef068931b85c7530a9ee82bd86896f44e0`.
- Production importer and independent source review: `291a7f2a8c607623cefe8dde9c0bba858d2963dc`; final test-only host/favicon diagnostics: `aa52358c05987b6f8dade40181260f364f33cd63`.
- [Actual Node/Chromium CI](https://github.com/trimcrae/Kid-games/actions/runs/36940684461), job `110631214349`, passed **10/10 suites**.
- Actions checked out PR synthetic merge `5cc580a3f769b9127a846b7040114376a93a9996`. Its tree and reviewed branch head's tree are identical: `c634aa4b9d43f12c4014ac75f2ff1c821a84c5c8`.

The actual Node suite ran 53 malformed cases and 75 genuine review-question combinations against each of three engine/key modes, plus quota failure, old pet/egg/house migration, reload, preservation of other profiles/namespaces/preferences, and lossless inter-engine transfers containing bought homes, equipped furniture, paid room styles, bank, shop, diary and mail progress. The real Chromium suite passed desktop and phone checks in game, standalone house and shared house modes, including the shared profile round trip through both engines and zero browser errors. The eight baseline focused suites also passed.

Independent isolated V8 review additionally checked all seven real profiles in both namespaces, all 37 bought homes with named rooms/styles/furniture, and 42 extra malformed room/bank/stall cases. These preliminary JS checks are distinct from the actual Node/browser run above. The browser fixture loads the real activity iframe inside a minimal same-origin host; it does not start the unchanged full 3D walkthrough. Real iOS Safari remains untested.

This repairs the activity engine's single-valley importer. The later family-bundle repair is documented below.

## Post Office damaged-save and live-reader recovery — completed

[PR #3](https://github.com/trimcrae/Kid-games/pull/3) is reviewed, validated and merged as `f400476238f786733291fca80ca6568447721704`. Actual final CI [36947199408](https://github.com/trimcrae/Kid-games/actions/runs/36947199408) passed 12/12 suites: 56 Node storage cases and Desktop/iPad/iPhone real Chromium checks, including second-tab updates, reader ownership, posting quota retry, reload and unrelated saves. Pages [36947678263](https://github.com/trimcrae/Kid-games/actions/runs/36947678263) published the tested merge successfully.

See [the bounded handoff](usage-sprint-2026-10-01-post-office.md) and [machine-readable receipt](usage-sprint-2026-10-01/post-office-validation.json). Original damaged bytes remain in local append-only safety copies before repaired writes; unusable external snapshots preserve live mail, and an unsafe write is refused visibly. The later family-bundle repair is documented below.

## Family-bundle restore — completed

[PR #4](https://github.com/trimcrae/Kid-games/pull/4) repairs the separate family-bundle restore in `house-test/save-copy.js`. Every incoming profile is prepared before writing; a verified bounded journal preserves exact prior house bytes and supports interrupted recovery. Actual final CI [36952828714](https://github.com/trimcrae/Kid-games/actions/runs/36952828714) passed 14/14 suites, including 163 Node checks and Chromium Desktop/iPad/iPhone groups through the production save panel/activity iframe. See [the bounded handoff](usage-sprint-2026-10-01-family-restore.md) for exact source, publication receipts and limits.

## Automatic house profile seeding — completed

[PR #5](https://github.com/trimcrae/Kid-games/pull/5) deeply prepares only absent house profile slots after engine preparation becomes available. Every present raw house value/reset marker is protected, all seven original namespaces are read-only, and export-only pages no longer seed progress or preferences. Actual CI [36957439473](https://github.com/trimcrae/Kid-games/actions/runs/36957439473) passed 16/16 suites, including 268 new Node checks and Chromium Desktop/iPad/iPhone groups. Reviewed source `341b5025b2671d74e29b6dfe3f3125f9144a8dc8` and normal merge `f230ba5455ec9991befaede92dc49de3dd3a5fbc` retain the identical tested tree. Pages [36957862837](https://github.com/trimcrae/Kid-games/actions/runs/36957862837) published the tested merge successfully.

See [the bounded handoff](usage-sprint-2026-10-01-house-auto-seeding.md) for source/log bindings, all-profile evidence and limits. This protects automatic seeding; the existing ordinary loader's behavior on an already damaged active save remains a separate audit.

## Next bounded tasks

1. **Audit damaged active house-save loading separately.** Reproduce exact raw preservation before the existing engine loader's ordinary normalization/write, with fresh ownership checks. Do not repeat completed automatic seeding or family restore.
2. Check transferred pet imports on a real iPad/iPhone when that environment is available.

Before each follow-on, read the latest main HEAD and repository guidance, inspect ongoing PRs, choose a bounded task, and get meaningful checks plus independent review before publication. The existing focused runner is `cd tests && npm run test:regressions`; targeted import suites are `craepets-import.cjs` and `craepets-import-browser.cjs`. The repo's AGENTS/CLAUDE guidance requires reviewed work to reach main. A temporary PR is useful for real CI when no local runtime exists.

No art, audio, private reference photos or generated-image cleanup was changed in this sprint.
