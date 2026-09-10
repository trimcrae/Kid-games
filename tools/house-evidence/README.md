# Narrated house walkthrough review

This is a local evidence workbench for improving the Craepets house from narrated
videos. It connects observations to the existing 23 real-house destinations,
named Blender assets, generator files and review cameras. Fictional Craepet Street
is excluded. **No video has been reviewed merely by creating a session.**

Run from the repository root with the installed Node runtime; no packages or
models need downloading. Keep original videos outside this repository or in the
homeowner's Git-ignored `House Tours/` drop folder. They must stay outside the
managed evidence workspace (which contains only ledgers and derived frames).

```powershell
node tools/house-evidence/cli.mjs init
node tools/house-evidence/cli.mjs add-video --file "House Tours/House Tour.MOV" --id house-tour
node tools/house-evidence/cli.mjs add-video --file "House Tours/Backyard tour.MOV" --id backyard-tour
node tools/house-evidence/cli.mjs serve
```

Open the printed `http://127.0.0.1:8766` address. Originals are fingerprinted and
streamed directly from their existing paths, with seeking and original audio.
The default private workspace is `~/.codex/private/house-evidence`. Every command
accepts `--workspace "D:/private/house-review"`. Workspaces inside this repository,
including paths routed through junctions, are refused. Do not serve the private
workspace using a public/static file server or add it to Git. The tool makes no
network requests to outside services; it does not upload media or transcribe speech.

## What to capture, and in what order

1. **Register and inventory every source.** Finish copying each video before
   registration. Keep its original filename, stable ID, SHA-256 and duration.
   `ffprobe` is optional; when installed it also records codec, rotation, frame rate
   and audio-stream metadata. Otherwise the browser records duration on opening.
   A supplied `--duration SECONDS` can support planning for a browser-unsupported
   codec. A local compatible viewing proxy, if needed, is a separate source;
   preserve the original and document any timestamp offset before citing the proxy.
2. **Watch and listen to the entire route.** Mark reviewed time ranges separately
   for visual footage and narration. Notes and sampled frames do not mark a range
   reviewed. The report unions overlapping ranges and lists remaining gaps through
   the end of every video. Rewatch blurred turns, rapid pans and doorway crossings.
   If there is no audio or a section is unintelligible, leave that gap visible and
   record the reason; do not pretend it supplied narration.
3. **Trace topology first.** For every threshold record the room on both sides,
   floor change and direction of travel. Capture a view before/after crossing and
   from the reverse direction. Record where the camera stands and faces whenever
   using left/right. Identify mirrors and reflected windows explicitly. Trace
   upper/lower/basement flights continuously before moving entire room groups.
4. **Review each room against all six checklists.** Layout covers entry/exit,
   every wall direction and a reverse view; openings cover every door/window;
   dimensions cover room/ceiling/stair/fixture sizes; materials cover floors,
   walls, ceilings, trim and fixture finishes; furniture covers orientation,
   silhouette and clearance; lighting covers windows, fixtures and reflections.
   The selected checklist is available in the session's model snapshot.
5. **Record evidence, not a guess disguised as a fact.** Each observation needs
   a source ID, time range in seconds, room, aspect, viewpoint, statement,
   evidence basis and confidence. Distinguish visible geometry, narration,
   measurements and inference. Quote narration only when checked; label paraphrases
   and uncertain words. Measurements require a positive value, units, method and
   uncertainty in dedicated fields; describe the measurement anchor as well.
   A guessed door width is an inference. Capture
   adjacent rooms with `relatedRoomId` and link exact `asset:`, `camera:` or `file:`
   targets from the current snapshot. Separate claims when their bases differ.
6. **Reconcile the two videos and older evidence.** Review every room from both
   directions and combine observations across source IDs. Mark conflicts explicitly
   and retain competing observations. New footage does not automatically invalidate
   a homeowner's prior correction; it might show changed furniture or a different
   angle. Mark unseen/not-applicable with reasons. Resolve seeded questions only
   with linked observations; keep a follow-up list for missing measurements/views.
7. **Propose, apply, then compare.** Keep a change record tied to evidence and exact
   model targets. First fix connectivity, handedness, levels, openings and scale;
   then fixtures/furniture; then material and lighting work. Each accepted layout
   change needs matched before/after camera views, including the reverse angle and
   another source view. A good match from one camera is not a complete reconstruction.

Coverage statuses describe the state of a **manual checklist review**, not a
machine-certified reconstruction. `supported` requires direct evidence, but is not
a claim that every wall or dimension is known. Layout/opening reviews with fewer
than two distinct visual viewpoints and dimensions without measurements are flagged.
High confidence in an inference still does not make it a measured fact.

## Narration and bounded frame extraction

Listen using the original video's normal controls. If a timed transcript becomes
available, import VTT, SRT or a JSON array of `{start,end,text}` (seconds):

```powershell
node tools/house-evidence/cli.mjs transcript --id walkthrough-01 --file "C:/private/main.vtt"
node tools/house-evidence/cli.mjs extract --id walkthrough-01 --plan
node tools/house-evidence/cli.mjs extract --id walkthrough-01 --limit 80 --ffmpeg "C:/installed/ffmpeg.exe"
node tools/house-evidence/cli.mjs extract --id walkthrough-01 --times 12.5,28,96 --ffmpeg "C:/installed/ffmpeg.exe"
```

Imported transcript text is **unverified**, even if an input JSON calls it reviewed.
Correct names, directions, numbers and pronouns by listening at the timestamp.
When the speaker describes a different room from the image, keep audio and visual
claims separate. Transcript review flags live in `session.json`; the player shows
their status. ASR is not configured here; a transcript is optional, not a prerequisite
to listening and recording timestamped narration.

Frame extraction needs an already-installed `ffmpeg`; pass its full path if it is
not on PATH. The planner requires no FFmpeg. It caps at 120 frames per batch (80
default), with a longest side of 1280 pixels, and checks that the conservative
2 MiB/frame budget leaves 10 GiB free. Long-video overview samples are spread over
the whole duration. The original file is never transcoded or copied by this tool.
Receipts record requested timestamps, source/frame hashes and successful outputs;
failed batches remain inspectable. Identical batches are refused to avoid duplicate
growth. Sampling is an index, not proof that all visual/narrated content was reviewed.
Only extract detailed frames where they answer a specific question.

## Model integration and acceptance

`session.json` contains a baseline snapshot of model source hashes, assets and
cameras. Source changes produce a report warning; reconcile them with proposed
edits. Do not replace the baseline silently. Coordinates are metres: Blender
`(X,Y,Z)` maps to browser `(X,Z,-Y)`. Front is Blender `-Y`, rear `+Y`, wing `+X`.
Current room anchors/elevations are estimates, not video-derived measurements.

Edit the source generators (`build.py`, `upstairs.py`, `extensions.py`,
`basement_garage.py`, `yard.py`), since regeneration replaces the `.blend`.
The private ledger's optional `changes` list records implementation receipts:

```json
{
  "id": "change-001",
  "summary": "Describe the specific before/after correction",
  "status": "proposed",
  "observationIds": ["an-existing-observation-id"],
  "targets": ["file:models/house/upstairs.py", "camera:ensuite"],
  "verification": "After application: comparison image paths, tested revision and check outcomes"
}
```

Change status is `proposed`, `applied` or `verified`; verified needs a receipt.
Edit optional change records/question resolutions directly in the private JSON
with the server stopped, then run `check`. Referenced observations cannot be
removed without reconciling their dependent reviews/questions/changes. Saves use
revision checks and retain one bounded `session.json.bak` recovery copy.
An exclusive `session.lock` prevents simultaneous CLI/server writers. If a process
is interrupted, inspect the ledger, backup and any temporary file before removing
its leftover lock; locks are never expired by age.

**Browser realism needs its own implementation pass.** The present exporter removes
modifiers and procedural textures, and exports only diffuse RGB plus a glass flag.
The browser forces roughness `.83` and metalness `0`. Improved Blender materials
alone therefore do not establish improved in-game realism. Use the video evidence
to plan procedural/mesh/material work plus supported browser material channels,
texture scale, normals, shadows, glazing and lighting, with explicit asset/performance
budgets. No image-generation models: Craepets uses code-built art. Omit people,
private pictures and transient clutter; never publish the reference recordings.

After actual model changes, run the existing checks:

```powershell
# Use the existing Blender/bpy runtime; do not download another just for intake.
python models/house/build.py -- --render --views primary,ensuite --preview-scale 50 --samples 4
python models/house/verify.py
python models/house/export_walkthrough.py
node models/house/test_walkthrough.mjs
node tests/house-routes.mjs
node tests/house-saves.cjs
node tests/house-craepets.cjs
```

Select affected named cameras, compare matching field of view and camera height
against timestamped footage, check reverse views, then inspect the browser on
desktop and phone. Reconcile runtime room anchors, activity addresses and collision
routes with geometry changes. Camera FOV/lens distortion, automatic exposure and
unknown absolute scale must remain explicit uncertainties, not fitted geometry.
Retain only needed comparison evidence; retire disposable render/test caches.
Publish only the model/code and a sanitized summary after verification.

## Inspect the review and test the framework

```powershell
node tools/house-evidence/cli.mjs check --hash
node tools/house-evidence/cli.mjs report
node --test tools/house-evidence/test.mjs
```

The reviewer binds only `127.0.0.1`, serves only registered media and its own UI,
and rejects foreign Origin/Host headers. Keep the private workspace owned by you.
Unit/integration tests use synthetic bytes and temporary sessions, never family
footage. No house geometry, game save or generated Blender asset changes merely
because this workbench is initialized or used.

For the browser integration test, expose an existing Playwright installation via
`NODE_PATH` and set `CHROMIUM_PATH` if Chrome is installed elsewhere, then run
`node tools/house-evidence/browser-test.mjs`. It records a tiny synthetic video with
tone audio, tests desktop/phone flows and removes its temporary inputs afterward.
