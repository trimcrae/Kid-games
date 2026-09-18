# Classic tales for Ellie

These are new read-aloud retellings of familiar traditional fairy tales, with Ellie in the leading role. They retain the recognizable plot, repetitions, objects and turning points rather than borrowing only a vague theme. Ellie remains a young child, with her established brown bob and the softly painted visual style selected by the user. She wears beautiful dresses without needing to be a princess.

The text, illustration briefs, vocabulary and comprehension questions live in `../classics.js`. That file is the single source used by both the reader and the narration builder. Each content page has its own illustration. The ending reuses the last illustration.

## Sources and adaptation choices

- **Ellie and the Three Bears:** the porridge/chair/bed sequences and discovery follow *The Story of the Three Bears* in [Joseph Jacobs's English Fairy Tales (1890)](https://www.gutenberg.org/cache/epub/7439/pg7439-images.html). Ellie takes the familiar Goldilocks role. The frightening escape is replaced by an apology, practical repair and a later invited visit.
- **Ellie and the Beanstalk:** the cow, magic beans, cloud castle, giant, golden hen, singing harp and noisy escape follow *Jack and the Beanstalk* in [English Fairy Tales](https://www.gutenberg.org/cache/epub/7439/pg7439-images.html). The visits are condensed. The hen and harp ask to return to their village. The giant stays safely above the clouds as the magic plant shrinks; there is no killing.
- **Cinderellie:** the exclusion, fairy godmother, pumpkin coach, transformed animals, midnight deadline, lost glass slipper and recognition follow [Cinderella; or, The Little Glass Slipper, illustrated by John R. Neill (1908)](https://www.gutenberg.org/files/77727/77727-h/77727-h.htm). Two fictional cousins take the unkind stepsisters' role; they are not Jeannie or Cory. At the children's ball, the prince asks Cinderellie to marry him. She replies “No Dude!” and offers to dance instead, as requested by the user. The ending brings everyone into the dance.

These editions are historical source material. The wording and illustrations here are newly created; no modern film dialogue, costume designs or song lyrics are used.

## Illustration recipe

Generated with the built-in OpenAI image tool. Primary reference: `../art/openai/giggly-ghost-0.webp`, the user's earlier Ellie painting. Secondary family reference, only where needed: `../art/openai/costume-party-5.webp`. Each later page also references its own story's opening painting for dress and setting continuity.

Make one landscape 4:3 picture-book painting for the page. Match the reference's luminous, dimensional painted faces, delicate eyelids, modeled cheeks and nose, fine hair, rich embroidered fabrics and warm reflected light. All humans must have the same painterly treatment as Ellie; avoid photographic faces, huge cartoon eyes, plastic dolls and flat simplified features. Keep Ellie recognizably three years old with her dark-brown bob and side-swept fringe. Follow the story's `outfit` and each page's `scene` exactly; no tiara unless the scene calls for one. Use daylight or night as specified. Preserve stated counts and recurring character designs. Keep essential faces and actions inside the frame. No text, lettering, panels, borders or watermark. Append the full story for continuity, then the current page text and scene brief, marked ILLUSTRATE ONLY THIS PAGE.

Final WebP assets live in `../art/openai/`, named after story ID and zero-based page. Original generated PNGs and complete per-image prompt receipts are retained privately outside the checkout.
