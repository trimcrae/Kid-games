# Adventure page illustrations

Production scope is every content node in all six Choose Your Own Adventure stories: **473 illustrations**. This includes all branches and endings, not just covers. Each cover reuses its story's opening illustration. The collection is in progress; the manifest contains only reviewed, integrated images.

## Sources and checks

- `inventory.json` records every source node, its exact text, original art description, incoming nodes and source hash. Refresh with `node tools/adventure-art.mjs --inventory` after story edits.
- `receipts/` stores the complete built-in image-generation prompt, reference filenames, selected style, visual review, original hash and final image hash for each accepted page.
- `node tools/adventure-art.mjs --manifest` checks receipt/source/image consistency, prints per-story coverage and rebuilds the reader manifest.
- `node tools/adventure-art.mjs --require-complete` fails until every one of the 473 pages is reviewed and present. Counts alone do not replace visual review.
- `tools/pack-adventure-art.py` converts accepted originals to WebP quality 90 without cropping or resizing. Original generated PNGs remain in Codex's generated-image storage; private batch records preserve their locations.
- `tools/verify-adventure-art.cjs` visits every integrated scene through reader choices, checks mobile layout, checks image failure and delayed-load behavior, and checks arcade registration. It uses installed Playwright and Chrome, and enforces the daily America/New_York computer-use restriction. Set `NODE_PATH` to the installed package directory and optionally `ADVENTURE_ART_EVIDENCE` to a screenshot path.

The six approved media and continuity rules are in [the art direction guide](../direction/README.md). Reuse accepted opening pages as story-specific character and style references. Art is static; narration, word definitions, choices, progress and quizzes remain in the reader.
