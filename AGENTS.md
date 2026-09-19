# Agent guidance

See [CLAUDE.md](./CLAUDE.md) for the full guidance for AI coding agents in
this repo.

**Most important rule: always merge your work into `main` and push it.** A task
is not done until it is on `main` (that is what deploys to GitHub Pages). No PR
is required unless the user asks for one.

## Generated-image cleanup (user instruction, 2026-09-19)

Clean up unnecessary local generated images as work proceeds. Once a reviewed
WebP and its generation receipt are committed and pushed to `main`, its bulky
local PNG original can be removed. Verify the final image's hash and publication
before removal, and retain the prompts, receipts and cleanup log. Keep unpublished
images, pending corrections, private reference photos and originals still needed
by pending generation jobs. Prefer published WebPs as future style references.

Use `tools/plan-adventure-cleanup.mjs` to prepare a private cleanup plan, then
`tools/cleanup-published-images.ps1` to validate it (add `-Apply` to remove the
listed files). Cleanup is limited to named generated PNGs, never whole folders.
The existing 10 GiB free-space reserve still applies to new generation.
