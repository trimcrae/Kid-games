# Active house saved-data preservation — 2026-10-02

AI-authored implementation and handoff, with independent AI code/method/receipt review.

The house activity engine previously accepted malformed active bytes through its ordinary loader, produced a blank valley, then persisted that blank state. A read-only admission boundary now refuses unsafe active state before automatic seeding or ordinary persistence. Startup/refresh and later external active corruption pause writes; a rejected sibling selection or visit leaves a healthy current lesson running. The local warning offers exact raw download and retry, without promising reconstruction or an unavailable import action.

This applies to `house-test/engine.js` in its standalone-house and shared-game save modes, across all seven native profiles. The original `games/craepets/craepets.js` runtime is unchanged.

## Verified scope

- Startup reads active selection and raw active slot before the existing pure preparer is registered. If this active state cannot be read/admitted, registration consumes only that automatic seeding cycle so a healthy sibling cannot hide the refusal. Every existing original/house raw profile and selection remains untouched.
- Genuine absence, legitimate current/legacy unadopted valleys and valid earned progress remain admissible. Detached temporary blank validation uses the unchanged pure preparer; the temporary pet is removed before any live result.
- Selection, owner visits, neighborhood reads, refresh and ordinary save callers validate before changing live state or writing. Storage read failure remains distinct from absence.
- The real house cold-start module recognizes refusal before its generic timeout and exposes a local, mode-bound recovery link. Paused native import/reset/read callbacks remain disabled; accessible recovery is download and retry.
- Existing automatic copy preparation, family journal/recovery/restore and pure normalizer/preparer bodies remain unchanged. Only the optional preparer-registration skip is new in `save-copy.js`; related cache tokens advance together.

## Evidence and actual validation

[PR #6](https://github.com/trimcrae/Kid-games/pull/6) is merged as `2af8008f63a1b391d739ab5e78ea66b77745b88e`. Reviewed source `ac6a27c5f26da8946d6081a202b080e77069470a`, actual CI checkout `c6234f458acd96eb28741f5d43ce2cad281a5573` and merge have identical tree `81dc0f3e7e41f7eb4fd6a0b82554bb47bfd3f1fe`; the merge preserves baseline main plus reviewed source as its parents.

Actual [CI36964150346](https://github.com/trimcrae/Kid-games/actions/runs/36964150346), job `110704107890`, completed **SUCCESS** with Node22.23.3 and **18/18 suites**:
- **390 new Node production cases**, including all seven house/shared profiles, malformed/raw/read-failure preservation, legitimate absent/blank/legacy/earned state, startup, selection, visits, refresh and external-update refusal.
- **Chromium Desktop/iPad/iPhone groups**, each checking fourteen active profile/mode refusal cases, exact namespace/selection bytes, production cold-start gate/link/download, failed-read retry, a healthy lesson after sibling refusal, sequential other-document active corruption and valid legacy/blank play.
- All16 inherited suites, including268 seeding cases,163 family-restoration cases, prior import and Post Office coverage.

The actual supported command was `npm run test:regressions` in `tests` on GitHub Actions. No local Node/browser or managed environment was available. Preliminary V8 checks are separate from these actual Node/browser results.

Pages [36964649768](https://github.com/trimcrae/Kid-games/actions/runs/36964649768) completed **SUCCESS** on the tested merge. The later handoff-only deployment is reported separately without another receipt commit.

See [the machine-readable receipt](usage-sprint-2026-10-01/active-house-save-validation.json), [independent review](usage-sprint-2026-10-01/active-house-save-review.json), [baseline fixture evidence](usage-sprint-2026-10-01/active-house-save-baseline.json), [original passing transcript](usage-sprint-2026-10-01/active-house-save-ci-final-original.log) and [original failed transcript](usage-sprint-2026-10-01/active-house-save-ci-initial-original.log). Passing log:122,682UTF8bytes, Gitblob `308347350dd1f37973e91dc822903f43f8ba2cd4`, SHA256 `a30b6928371fd493f005de0d4ae053f2572f5008f0a314eb6c97825cd365804c`. Initial log:138,175UTF8bytes, Gitblob `774e2917412c1bb162ddbb7a94634afd802de208`, SHA256 `5c00cf51526c2cdcdcb6f1e47f3417b4233f73947831222c60b884d898769c2d`. Root and independent reviewer verified source/method, original logs and exact CI tree bindings.

The preliminary baseline is fourteen synthetic fixture witnesses (seven profiles × two prefixes) executing real house load/normalization/save sections and content tables in isolated V8 adapters. Every malformed active raw string became a persisted blank pet with 60 coins. That is preliminary adapter evidence, not actual Node/browser execution or a claim about the original main-game runtime.

The first actual CI `36963266342` / job `110701389979` failed **14/18 suites** at initial source `aca8b135b5ab7cd46b177c0bf4bd35c35de3aa4e`. Its original transcript is retained. Four scoped test assumptions were repaired: cross-VM JSON field comparison, blank-state sibling fixture, invalid-versus-absent WHO seeding fixture and a broad equality guard containing deliberately changed imperative callers. The final guard still checks exact shared blank defaults, normalizer and pure preparation; independent raw storage assertions remain exact. The accessible warning also stopped promising an unavailable backup-restore action.

## Limits and next separate task

Checks use synthetic family fixtures, never real child saves. Browser evidence uses real production activity/scripts and cold-start module gate/link in a minimal same-origin host, with Chromium Desktop/iPad/iPhone emulation. It does not establish a full 3D walkthrough, later parent warning behavior after live corruption, physical iOS Safari, storage durability or simultaneous-tab atomicity. Sequential other-document storage events are covered. No new journal/recovery copies or automatic reconstruction are added.

The next separate bounded candidate is the untouched original `games/craepets/craepets.js` active-save load-before-write path: inspect fresh ownership and reproduce a real byte-loss defect before considering changes. Stop with a no-change result if the defect cannot be demonstrated. Do not repeat completed house loader, seeding, family restore, importer or Post Office work, and do not expand recovery-copy management.

This finite task stops after reviewed integration and observed Pages publication.
