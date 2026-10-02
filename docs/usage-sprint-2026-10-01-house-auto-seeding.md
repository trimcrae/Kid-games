# House automatic seeding — bounded usage sprint

AI-authored implementation and evidence record; independently reviewed before integration. This task repairs automatic seeding only, after the completed importer, Post Office and family-restore work.

## Confirmed defect and resulting behavior

At baseline `8dc6b584488f34a2894bf4557bbb72db8ab6e864`, the actual `house-test/save-copy.js` IIFE admitted an original valley with `stats: "broken"`/fractional house level and replaced an existing damaged house raw value. Independent V8 storage-adapter witnesses reproduced this for all seven native profiles. These are code reproductions, not physical-browser observations.

Automatic seeding now runs after the existing pure preparer registers. It parses detached original bytes, deeply prepares only genuinely absent house slots, and rechecks target/reset presence before writing. Every present house value, including empty string, JSON null, old version and malformed bytes, is protected by `getItem !== null`. A present reset marker also suppresses seeding. Original game bytes remain read-only. Eligible profiles are handled independently, so a source/read/copy failure does not erase another profile's earlier state. Only verified new copies are reported. Usable native house selection is retained; an invalid selection can fall back only to an actual native usable profile. Metadata failures do not discard valid new copies.

Shared game mode remains isolated. Pending recovery is still performed before any seed registration, and a visit that completed recovery does not automatically seed. Export-only `saves.html` has no preparer registration and is now read-only. The family journal, recovery, pure normalizer, house engine, original game engine and Post Office bodies are unchanged. Paired script cache tokens advance together. The unused shallow-overwrite test `tests/house-saves.cjs` is a documented compatibility forwarder to the supported family and seeding suites.

## Validation and exact revision

Source: `341b5025b2671d74e29b6dfe3f3125f9144a8dc8`, tree `47489070df8c2f6add3f4ad791fd5e91558ec327`, [PR5](https://github.com/trimcrae/Kid-games/pull/5).

Actual [Node/Chromium CI 36957439473](https://github.com/trimcrae/Kid-games/actions/runs/36957439473), job 110683453450, completed **SUCCESS** at 2026-10-02T02:54:24Z on Node 22.23.3: **16/16 suites**, 268 new production checks, all three Chromium seeding groups and 163 inherited family checks. Original checkout `37c6011104332b231112e0b2bc98ccb72b0a7aae` has the same tree as the reviewed source. Independent source, test, CI and tree-binding review cleared it.

Normal merge `f230ba5455ec9991befaede92dc49de3dd3a5fbc` retains parents `8dc6b584488f34a2894bf4557bbb72db8ab6e864` and reviewed source `341b5025b2671d74e29b6dfe3f3125f9144a8dc8`, with that exact tested tree. [Pages 36957862837](https://github.com/trimcrae/Kid-games/actions/runs/36957862837) completed **SUCCESS** on the tested merge (updated 2026-10-02T02:56:35Z). A later handoff commit changes documentation/logs/receipts only; final docs-head publication is observed separately without another self-recording commit.

[Machine-readable receipt](usage-sprint-2026-10-01/house-auto-seeding-validation.json), [original full job transcript](usage-sprint-2026-10-01/house-auto-seeding/ci-36957439473-job-110683453450.log), [independent review](usage-sprint-2026-10-01/house-auto-seeding/independent-review.md) and [baseline witness](usage-sprint-2026-10-01/house-auto-seeding/baseline-witness.json) preserve provenance. Original transcript: 82,111 UTF-8 bytes, Git blob `ccdc55b5eda4147eef4328ba99a2618903da2de1`, independently computed SHA256 `617e3277f9f2a95409a7fd2f4ee34a3b8e377874869dc9d21cdf411125f2e6a0`. The normal merge's automatic CI rerun is separate from the completed exact-source proof above.

The new Node suite uses the actual production IIFE and pure engine preparer/content tables. Its 268 checks cover all seven profiles, 133 malformed-source combinations, 56 present-raw targets, 21 reset markers, 28 storage failure combinations, delayed registration, paid progress/native tiers, legacy defaults, post-preparation rechecks, metadata failure, shared mode, export-only behavior and pending recovery suppression. Preliminary V8 adapters also executed these 268 cases and the unchanged 163 family cases; only the GitHub Actions receipt supplies Node results.

The new Chromium groups use actual production activity, save mode and export pages in a minimal iframe host. They cover a valid active profile with a damaged sibling, malformed original source, empty reset marker, one-shot quota failure/retry, all seven original profile namespaces, legacy defaults, a real learning reward and reload, shared mode and a real downloaded family export. Date alone is fixed for exact-byte assertions; browser timers/events and storage are real. Device groups are Desktop 1280×900, iPad 820×1180 and iPhone 390×844 with Chromium touch/mobile emulation. The compatibility forwarder itself is not a separate default suite; its two target suites are run individually by CI.

## Limits and stop condition

Exact-byte protection here concerns automatic seeding. The existing ordinary engine loader/save may still normalize an already damaged active house valley; that broader behavior was not rewritten or proved safe by these sibling-isolation tests. Family recovery's retained raw journal copies and eight-record limit are unchanged. Per-profile admission and sequential storage events are tested; simultaneous tabs or multi-key localStorage atomicity are not established. Physical iOS Safari, the full 3D house walkthrough and unavailable-storage guarantees beyond the tested adapters remain unverified.

Stop after independent review, actual exact-source CI, normal main integration and final Pages success. Do not repeat completed importer/family-restore/Post Office work or create a receipt deployment loop.

## Next separate bounded task

Inspect a damaged *active* house save before the existing loader's ordinary normalization/write, with an explicit exact-byte preservation witness. Do not reuse automatic seeding as a substitute for that separate recovery audit, and do not broaden it without fresh ownership and input checks.
