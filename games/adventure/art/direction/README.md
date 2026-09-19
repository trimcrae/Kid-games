# Approved adventure illustration styles

The user selected **M1, R3, C2, P2, S1, L1** on September 17, 2026, after reviewing six generated comparison sheets, and subsequently requested illustrations for every page. These are the approved directions for Choose Your Own Adventure. The sheets are concept references, not finished story pages. Reviewed production illustrations are integrated through [the generated-art manifest](../generated/manifest.js); remaining pages retain their original artwork while production continues.

| Story / family | Selected style | Authoritative sample |
| --- | --- | --- |
| Block World and all Minecraft adventures | **M1 — Cinematic voxel** | [Left panel](blockworld-options.png) |
| Ellie & the Rainbow Dragon | **R3 — Wax-crayon wonder** | [Right panel](rainbow-options.png) |
| The Great Family Campout | **C2 — Field-journal adventure** | [Middle panel](campout-options.png) |
| Pizza Planet Rescue | **P2 — Clay cosmic comedy** | [Middle panel](pizza-options.png) |
| The Mermaid's Lost Song | **S1 — Sea-glass mosaic** | [Left panel](mermaid-options.png) |
| The Whispering Library | **L1 — Paper-theatre worlds** | [Left panel](library-options.png) |

## Style specifications

- **M1:** Dimensional cube-built characters and environments, visible pixel textures on matte blocks, atmospheric distance and warm cinematic light. Preserve Minecraft geometry throughout forests, caves, villages, seas, sky islands, redstone and the finale. All current and future Minecraft stories share this direction.
- **R3:** Vivid wax-crayon and oil-pastel marks on textured paper, loose expressive outlines, cheerful flat shapes and a handmade drawing quality. Keep the dragon's changing body-part colors faithful to the current branch; the opening dragon is grey.
- **C2:** An illustrated outdoor field journal: fine ink lines and crosshatching with earthy colored-pencil shading on cream paper. Draw expressive family characters and observable camping/nature details. Keep this medium during both daylight and night scenes.
- **P2:** A tactile stop-motion clay world with visible sculpting marks, expressive squishy aliens, miniature rocket and planet sets, and tangible pizza toppings. Keep the red-planet aliens' three eyes and all educational counts exact.
- **S1:** A complete sea-glass mosaic world in translucent aquamarine, cobalt, pearl and coral tesserae. Construct characters, tails, clothing, shells, water and backgrounds from the same material vocabulary. Keep faces readable and expressions gentle.
- **L1:** Elaborate paper-engineered miniature worlds: folded pages, precisely cut scenery, layered paper characters and dimensional shadows. Pirates, dinosaurs, space, fairy tales, mysteries, myths and the finale must all look like parts of the same paper-theatre book.

## Continuity and generation

Use the [production character references](continuity.md) for accepted designs and recurring settings.

After a reviewed image and its receipt reach `main`, use its published WebP for
future references and remove the unnecessary local generated PNG. Keep pending
images and references until their replacements are published. The cleanup tools
in `tools/` verify hashes and publication and retain a private deletion log.

1. Use only the selected panel of the relevant sheet as the style reference. Explicitly identify its position in every generation prompt. The other two panels are unselected alternatives and must not influence the image.
2. Use the sheet for medium, finish and visual language, not as an exact cast, identity, costume or scene specification. The samples contain invented staging and simplified casts.
3. Read the exact story node, its original artwork, and relevant earlier branch nodes before generating each scene. Respect actions, expressions, named colors, counts, acquired items and who is actually present.
4. Establish reusable character and recurring-location references in the selected medium before producing the complete story. Keep ages, recognizable features, proportions, clothing and designs consistent, except where the text requires a change.
5. Related stories use one shared style. Unrelated story families retain their individually selected styles. In particular, do not apply Pizza Planet's clay look to the Library's space branch.
6. These directions deliberately differ from Spooky Princess Stories. Do not reuse its luminous violet-and-gold painting style. Identity cues may be shared when appropriate, but rendering must follow this guide.
7. Finished scene art should be a single illustration without the comparison sheet's headings, labels, borders or alternate panels. Frame for the adventure reader, with key subjects fully visible.
8. Generate using the built-in OpenAI image tool. The user's explicit request for generated adventure imagery and these selections supersede the older restriction on generated child/creature art for these adventures only. Craepets is outside this scope.
9. Inspect each result for style, continuity and story accuracy. A style selection alone does not approve inaccurate faces, casts or scene details in these preview sheets.

## Provenance

The six original PNG comparison sheets were generated with Codex's built-in OpenAI image tool and copied here unchanged. [selections.json](selections.json) records the selected panels, story IDs and complete original comparison-sheet prompts. Those prompts generate comparison sheets; use the specifications above and the exact node text to write production-page prompts.
