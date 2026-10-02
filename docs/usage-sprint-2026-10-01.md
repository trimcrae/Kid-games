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

## Active house-save loader preservation — completed

[PR #6](https://github.com/trimcrae/Kid-games/pull/6) refuses damaged active house/shared saves before automatic seeding or ordinary writes, preserves raw selection and profile bytes, and keeps a healthy lesson usable when a sibling is refused. Accessible local download/retry is available through the activity warning and the real house cold-start recovery link. Genuine absent, unadopted and legacy progress remains supported.

Actual [CI36964150346](https://github.com/trimcrae/Kid-games/actions/runs/36964150346), job110704107890, passed18/18 suites, including390 new Node cases and Chromium Desktop/iPad/iPhone groups with all fourteen profile/mode refusals. Reviewed source `ac6a27c5f26da8946d6081a202b080e77069470a`, actual checkout and normal merge `2af8008f63a1b391d739ab5e78ea66b77745b88e` share tested tree `81dc0f3e7e41f7eb4fd6a0b82554bb47bfd3f1fe`. Pages [36964649768](https://github.com/trimcrae/Kid-games/actions/runs/36964649768) published that merge successfully.

See [the bounded handoff](usage-sprint-2026-10-01-active-house-save.md) for exact source/tree/log bindings, the retained first failed CI, primary fixture evidence and limits. The original main-game runtime, pure preparer/normalizer and family journal are unchanged.

## Original game active-save loader preservation — completed

[PR #7](https://github.com/trimcrae/Kid-games/pull/7) refuses damaged original-game active saves before ordinary writes and preserves exact raw bytes for all seven native profiles in the original and house namespaces, and their selection. Local literal download/retry remains accessible after existing news or delayed prize callbacks. Safe blank/legacy/adopted learning and a healthy lesson after sibling refusal remain supported.

Actual [CI36971653812](https://github.com/trimcrae/Kid-games/actions/runs/36971653812), job110726688606, passed **20/20 suites**:198 new Node production cases and all three Chromium Desktop/iPad/iPhone groups, plus18 inherited suites. Reviewed source `5123281553c335250bd8952f4da757353b7273e1`, actual checkout and normal merge `e01ce7c048b7052fb9aa2bec4e0ffead116e5a95` share exact tested tree `86f5375be7186073ea098089c3065fffb029cd1d`. Pages [36972324871](https://github.com/trimcrae/Kid-games/actions/runs/36972324871) published the tested merge successfully.

See [the bounded handoff](usage-sprint-2026-10-01-original-game-save.md) for source/tree/log bindings, the retained first actual19/20 failed run and exact browser/adapter limits. House, family, seeding and Post Office runtime files and pure preparation/normalization remain unchanged.

## Sprint stopping point

This finite original-game task returns ownership after reviewed publication. No additional independently demonstrated defect is queued and no second task is started. Transferred-pet checks on physical iPad/iPhone remain outstanding until such an environment is available.

Before each follow-on, read the latest main HEAD and repository guidance, inspect ongoing PRs, choose a bounded task, and get meaningful checks plus independent review before publication. The existing focused runner is `cd tests && npm run test:regressions`; targeted import suites are `craepets-import.cjs` and `craepets-import-browser.cjs`. The repo's AGENTS/CLAUDE guidance requires reviewed work to reach main. A temporary PR is useful for real CI when no local runtime exists.

No art, audio, private reference photos or generated-image cleanup was changed in this sprint.


## Life Lab prediction credit, complete

Repeated checks can no longer award multiple prediction credits for one puzzle, and edited or reset shown answers remain practice until New puzzle. Wrong-before-credit correction remains usable; Show retains its explicit streak reset. Existing bests/badges and all unrelated profile saves are retained.

Reviewed source 8d2fc33b0d89fa27fa3aead7e46d5199af0ad28e passed [actual CI 36980400766](https://github.com/trimcrae/Kid-games/actions/runs/36980400766): 27 Node production-control cases, three full production-page Chromium Desktop/iPad/iPhone groups, and 22/22 suites. [PR8](https://github.com/trimcrae/Kid-games/pull/8) merged normally as 1141420a00e3e83e19eefa237a9dee09097bda31; [code Pages 36981846450](https://github.com/trimcrae/Kid-games/actions/runs/36981846450) succeeded on that merge. See [handoff and exact original receipts](usage-sprint-2026-10-01-life-prediction.md). Initial cancelled CI and its real test-fixture failure are preserved separately. Chromium emulation does not establish physical iOS Safari. No further demonstrated defect or task is queued; ownership returns to the coordinator after final docs Pages.
